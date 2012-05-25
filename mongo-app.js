/*global process, require */
/*jslint devel: true */

var http = require('http');
var cereal = require('cereal');
var atomize = require('atomize-server');
var mongodb = require('mongodb');

var Db = mongodb.Db,
    DbServer = mongodb.Server;

var httpServer = http.createServer();
var port = 9999;
var port_index = process.argv.indexOf('--port');
if (port_index > -1) {
    port = process.argv[port_index + 1];
}

var atomizeServer = atomize.create(httpServer, '[/]atomize');
var atomizeClient = atomizeServer.client();

var dbName = 'test';
var dbCollections = {};

var db = new Db(dbName,
                new DbServer("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 4}),
                {native_parser: false});

//atomizeClient.logging(true);

function Item (collMongo, itemAtomize) {
    this.collMongo = collMongo;
    this.itemAtomize = itemAtomize;
}
Item.prototype = {
    constructor: Item,
    ignore: true,
    running: false,
    watchFun: function (inTxn, deltas) {
        var self = this, itemDelta, itemCopy;
        if (! this.ignore) {
            itemDelta = deltas.get(this.itemAtomize);
            if (!(itemDelta.added.length === 0 &&
                  itemDelta.deleted.length === 0 &&
                  itemDelta.modified.length === 1 &&
                  (itemDelta.modified[0] === '_storedVersion' ||
                   itemDelta.modified[0] === '_version'))) {
                if (inTxn) {
                    this.itemAtomize._version += 1;
                } else {
                    itemCopy = cereal.parse(cereal.stringify(this.itemAtomize));
                    itemCopy._storedVersion = itemCopy._version;
                    this.collMongo.update({_id: itemCopy._id}, itemCopy, {safe:true}, function (err) {
                        if (err) {throw err;}
                        atomizeClient.atomically(function () {
                            self.itemAtomize._storedVersion = itemCopy._storedVersion;
                        });
                    });
                }
            }
        }
        if (this.ignore && !inTxn) {
            this.ignore = false;
        }
        if (inTxn) {
            return deltas;
        } else {
            return true;
        }
    },
    watch: function () {
        if (this.running) {return;}
        this.running = true;
        atomizeClient.watch(this.watchFun.bind(this), this.itemAtomize);
    }
};

function Collection (collMongo, collAtomize) {
    this.collMongo = collMongo;
    this.collAtomize = collAtomize;
    this.items = {};
}

Collection.prototype = {
    constructor: Collection,
    ignore: true,
    running: false,
    watchFun: function (inTxn, deltas) {
        var collDelta, idx, key;
        if (! this.ignore) {
            collDelta = deltas.get(this.collAtomize);
            if (inTxn) {
                while (collDelta.modified.length > 0) {
                    key = collDelta.modified.pop();
                    collDelta.deleted.push(key);
                    collDelta.added.push(key);
                }
                for (idx = 0; idx < collDelta.added.length; idx += 1) {
                    key = collDelta.added[idx],
                    this.addItem(key, this.collAtomize[key], true);
                }
            } else {
                while (collDelta.deleted.length > 0) {
                    key = collDelta.deleted.pop();
                    this.items[key].running = false;
                    delete this.items[key];
                    this.collMongo.remove({_name: key});
                }
                while (collDelta.added.length > 0) {
                    key = collDelta.added.pop();
                    this.addItem(key, this.collAtomize[key], false);
                }
            }
        }
        if (this.ignore && !inTxn) {
            this.ignore = false;
        }
        if (inTxn) {
            return deltas;
        } else {
            return this.running;
        }
    },
    watch: function () {
        if (this.running) {return;}
        this.running = true;
        atomizeClient.watch(this.watchFun.bind(this), this.collAtomize);
    },
    addItem: function (key, obj, inTxn) {
        if (inTxn) {
            obj._storedVersion = 0;
            obj._version = 1;
            obj._name = key;
        } else {
            var self = this;
            (function () {
                var objCopy = cereal.parse(cereal.stringify(obj));
                objCopy._storedVersion = objCopy._version;
                self.collMongo.insert(objCopy, {safe: true}, function (err) {
                    if (err) {throw err;}
                    atomizeClient.atomically(function () {
                        obj._storedVersion = objCopy._storedVersion;
                    }, function () {
                        self.items[key] = new Item(self.collMongo, obj);
                        self.items[key].watch();
                    });
                });
            }());
        }
    },
    populateMongoAndWatch: function () {
        if (this.running) { return; }
        var self = this;
        this.ignore = true;
        atomizeClient.atomically(function () {
            var keys = Object.keys(self.collAtomize), key;
            while (keys.length > 0) {
                key = keys.pop();
                self.addItem(key, self.collAtomize[key], true);
            }
            return cereal.parse(cereal.stringify(self.collAtomize));
        }, function (c) {
            var keys = Object.keys(c), key;
            while (keys.length > 0) {
                key = keys.pop();
                self.addItem(key, self.collAtomize[key], false);
            }
            self.watch();
        });
    },
    populateAtomizeAndWatch: function () {
        if (this.running) { return; }
        var self = this;
        this.ignore = true;
        this.collMongo.find({}, function (err, cursor) {
            if (err) {throw err;}
            cursor.toArray(function (err, items) {
                if (err) {throw err;}
                atomizeClient.atomically(function () {
                    var idx, item, itemCopy, itemAtomize, key;
                    for (idx = 0; idx < items.length; idx += 1) {
                        item = items[idx];
                        key = item._name;
                        itemCopy = cereal.parse(cereal.stringify(item));
                        self.collAtomize[key] = atomizeClient.lift(itemCopy);
                    }
                }, function () {
                    for (idx = 0; idx < items.length; idx += 1) {
                        item = items[idx];
                        key = item._name;
                        self.items[key] = new Item(self.collMongo, self.collAtomize[key]);
                        self.items[key].watch();
                    }
                    self.watch();
                });
            });
        });
    }
};

function Database (dbMongo, dbAtomize) {
    this.dbMongo = dbMongo;
    this.dbAtomize = dbAtomize;
    this.collections = {};
}

Database.prototype = {
    constructor: Database,
    ignore: true,
    running: false,
    watchFun: function (inTxn, deltas) {
        var self = this, dbDelta, key, item;
        if (! this.ignore) {
            dbDelta = deltas.get(this.dbAtomize);
            if (! inTxn) {
                while (dbDelta.modified.length > 0) {
                    key = dbDelta.modified.pop();
                    dbDelta.deleted.push(key);
                    dbDelta.added.push(key);
                }
                while (dbDelta.deleted.length > 0) {
                    key = dbDelta.modified.pop();
                    this.collections[key].running = false;
                    delete this.collections[key];
                    this.dbMongo.dropCollection(key);
                }
                while (dbDelta.added.length > 0) {
                    (function () {
                        var key = dbDelta.added.pop(),
                            collAtomize = self.dbAtomize[key];
                        self.dbMongo.createCollection(
                            key, function (err, collMongo) {
                                var c = new Collection(collMongo, collAtomize);
                                self.collections[key] = c;
                                c.populateMongoAndWatch();
                            });
                    }());
                }
            }
        }
        if (this.ignore && !inTxn) {
            this.ignore = false;
        }
        if (inTxn) {
            return deltas;
        } else {
            return this.running;
        }
    },
    watch: function () {
        if (this.running) {return;}
        this.running = true;
        atomizeClient.watch(this.watchFun.bind(this), this.dbAtomize);
    },
    populateAtomizeAndWatch: function () {
        if (this.running) { return; }
        var self = this;
        this.ignore = true;
        this.dbMongo.collections(function (err, collections) {
            if (err) {throw err;}
            atomizeClient.atomically(function () {
                var collMongo, collAtomize, collsToStart = [];
                while (collections.length > 0) {
                    collMongo = collections.pop();
                    if (/system\./.test(collMongo.collectionName)) {
                        continue;
                    }
                    collAtomize = atomizeClient.lift({});
                    self.collections[collMongo.collectionName] =
                        new Collection(collMongo, collAtomize);
                    self.dbAtomize[collMongo.collectionName] = collAtomize;
                    collsToStart.push(self.collections[collMongo.collectionName]);
                }
                return collsToStart;
            }, function (collsToStart) {
                var coll;
                while (collsToStart.length > 0) {
                    coll = collsToStart.pop();
                    coll.populateAtomizeAndWatch();
                }
                self.watch();
            });
        });
    }
};

db.open(function (err, dbMongo) {
    if (err) {throw(err);}

    atomizeClient.atomically(function () {
        var dbAtomize = atomizeClient.lift({});
        atomizeClient.root.mongo = atomizeClient.lift({});
        atomizeClient.root.mongo[dbName] = dbAtomize;
        return dbAtomize;
    }, function (dbAtomize) {
        var database = new Database(dbMongo, dbAtomize);
        database.populateAtomizeAndWatch();
        console.log(" [*] Listening on 0.0.0.0:" + port);
        httpServer.listen(port, '0.0.0.0');
    });
});
