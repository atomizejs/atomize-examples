// atomize-translate unittests.js unittests-compat.js atomize '$(document)' NiceException Error

var URL = "http://localhost:9999/atomize";


function NiceException() {};
NiceException.prototype = Error.prototype;

var niceException = new NiceException();

function withAtomize (clientsAry, test) {
    var atomize = new Atomize(URL);
    atomize.onAuthenticated = function () {
        atomize.atomically(function () {
            var key = Date();
            atomize.root[key] = atomize.lift({});
            return key;
        }, function (key) {
            var i;
            for (i = 0; i < clientsAry.length; i += 1) {
                clientsAry[i] = new Atomize(URL);
                if (0 === i) {
                    clientsAry[i].onAuthenticated = function () {
                        test(key, clientsAry, function () {
                            for (i = 0; i < clientsAry.length; i += 1) {
                                clientsAry[i].close();
                                clientsAry[i] = undefined;
                            }
                            atomize.atomically(function () {
                                delete atomize.root[key];
                            }, function () {
                                atomize.close();
                            });
                        });
                    };
                } else {
                    (function () {
                        var j = i - 1;
                        clientsAry[i].onAuthenticated = function () {
                            clientsAry[j].connect();
                        }
                    })();
                }
            }
            clientsAry[clientsAry.length - 1].connect();
        });
    };
    atomize.connect();
}

function clients (n) {
    var ary = [];
    ary.length = n;
    return ary;
}

function contAndStart (cont) {
    cont();
    start();
}

$(document).ready(function(){

    asyncTest("Empty transaction", 2, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0];
            c1.atomically(function () {
                ok(true, "This txn has no read or writes so should run once");
            }, function () {
                ok(true, "The continuation should be run");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Await private empty root", 2, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0];
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    ok(true, "We should retry at least once");
                    c1.retry();
                }
                return Object.keys(c1.root[key]).length;
            }, function (fieldCount) {
                strictEqual(fieldCount, 0, "Root object should be empty");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Set Primitive", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0],
                value = 5;
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = value;
                return c1.root[key].field;
            }, function (result) {
                strictEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Set Empty Object", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0],
                value = {};
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
                return c1.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Set Complex Object", 1, function () {
        withAtomize(clients(1), function (key, clients, cont) {
            var c1 = clients[0],
                value = {a: "hello", b: true, c: 5, d: {}};
            value.e = value; // add loop
            value.f = value.d; // add non-loop alias
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
                return c1.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Trigger (add field)", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                trigger = "pop!";

            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].trigger) {
                    c1.retry();
                }
                return c1.root[key].trigger;
            }, function (result) {
                strictEqual(trigger, result, "Should have received the trigger");
                contAndStart(cont);
            });

            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                if (undefined === c2.root[key].trigger) {
                    c2.root[key].trigger = trigger;
                } else {
                    throw "Found existing trigger!";
                }
            }); // no need for a continuation here
        });
    });

    asyncTest("Trigger (add and change field)", 3, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                trigger1 = "pop!",
                trigger2 = "!pop";

            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].trigger) {
                    c1.retry();
                }
                if (c1.root[key].trigger == trigger1) {
                    c1.root[key].trigger = trigger2;
                    return true;
                } else {
                    return false;
                }
            }, function (success) {
                ok(success, "Reached 1");
            });

            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                if (undefined === c2.root[key].trigger) {
                    c2.root[key].trigger = trigger1;
                } else {
                    throw "Found existing trigger!";
                }
            }, function () {
                ok(true, "Reached 2");
                c2.atomically(function () {
                    if (trigger2 != c2.root[key].trigger) {
                        c2.retry();
                    }
                }, function () {
                    ok(true, "Reached 3");
                    contAndStart(cont);
                });
            });
        });
    });

    asyncTest("Trigger (add and remove field)", 3, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                trigger = "pop!";

            c1.atomically(function () {
                if (undefined === c1.root[key] ||
                    undefined === c1.root[key].trigger) {
                    c1.retry();
                }
                delete c1.root[key].trigger;
            }, function () {
                ok(true, "Reached 1");
            });

            c2.atomically(function () {
                if (undefined === c2.root[key]) {
                    c2.retry();
                }
                if (undefined === c2.root[key].trigger) {
                    c2.root[key].trigger = trigger;
                } else {
                    throw "Found existing trigger!";
                }
            }, function () {
                ok(true, "Reached 2");
                c2.atomically(function () {
                    if (undefined !== c2.root[key].trigger) {
                        c2.retry();
                    }
                }, function () {
                    ok(true, "Reached 3");
                    contAndStart(cont);
                });
            });
        });
    });

    asyncTest("Send Primitive", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                value = 5;
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = value;
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].field) {
                    c2.retry();
                }
                return c2.root[key].field;
            }, function (result) {
                strictEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Send Empty Object", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                value = {};
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].field) {
                    c2.retry();
                }
                return c2.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    asyncTest("Send Complex Object", 1, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                value = {a: "hello", b: true, c: 5, d: {}};
            value.e = value; // add loop
            value.f = value.d; // add non-loop alias
            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                } else if (undefined !== c1.root[key].field) {
                    throw "Found existing field!";
                }
                c1.root[key].field = c1.lift(value);
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].field) {
                    c2.retry();
                }
                return c2.root[key].field;
            }, function (result) {
                deepEqual(result, value, "Should have got back value");
                contAndStart(cont);
            });
        });
    });

    // For some reason, the current Proxy thing suggests all
    // descriptors should be configurable. Thus we don't test for the
    // 'configurable' meta-property here. This issue should go away
    // once "direct proxies" arrive.
    asyncTest("Keys, Enumerate, etc", 10, function () {
        withAtomize(clients(2), function (key, clients, cont) {
            var c1 = clients[0],
                c2 = clients[1],
                descriptors = {a: {value: 1,
                                   writable: true,
                                   enumerable: true},
                               b: {value: 2,
                                   writable: false,
                                   enumerable: true},
                               c: {value: 3,
                                   writable: true,
                                   enumerable: false},
                               d: {value: 4,
                                   writable: false,
                                   enumerable: false}};

            c1.atomically(function () {
                if (undefined === c1.root[key]) {
                    c1.retry();
                }
                var keys = Object.keys(descriptors),
                    x, field, descriptor;
                for (x = 0; x < keys.length; x += 1) {
                    field = keys[x];
                    descriptor = descriptors[field];
                    Object.defineProperty(c1.root[key], field, descriptor);
                }
                c1.root[key].done = true;
            });
            c2.atomically(function () {
                if (undefined === c2.root[key] ||
                    undefined === c2.root[key].done) {
                    c2.retry();
                }
                delete c2.root[key].done;
                var keys = Object.keys(c2.root[key]),
                    names = Object.getOwnPropertyNames(c2.root[key]),
                    enumerable = [],
                    descriptors = {},
                    field, x;
                for (field in c2.root[key]) {
                    enumerable.push(field);
                }
                for (x = 0; x < names.length; x += 1) {
                    field = names[x];
                    descriptors[field] = Object.getOwnPropertyDescriptor(c2.root[key], field);
                    delete descriptors[field].configurable; // see comment above
                }
                return {keys: keys.sort(),
                        names: names.sort(),
                        enumerable: enumerable.sort(),
                        descriptors: descriptors,
                        hasA: 'a' in c2.root[key],
                        hasC: 'c' in c2.root[key],
                        hasZ: 'z' in c2.root[key],
                        hasOwnA: ({}).hasOwnProperty.call(c2.root[key], 'a'),
                        hasOwnC: ({}).hasOwnProperty.call(c2.root[key], 'c'),
                        hasOwnZ: ({}).hasOwnProperty.call(c2.root[key], 'z')};
            }, function (result) {
                deepEqual(result.keys, ['a', 'b'],
                          "Keys should have found enumerable fields");
                deepEqual(result.enumerable, ['a', 'b'],
                          "Enumeration should have found enumerable fields");
                deepEqual(result.names, ['a', 'b', 'c', 'd'],
                          "Should have found field names 'a' to 'd'");
                deepEqual(result.descriptors, descriptors,
                          "Should have got same descriptors back");
                ok(result.hasA, "Should have found field 'a'");
                ok(result.hasC, "Should have found field 'c'");
                ok(! result.hasZ, "Should not have found field 'z'");
                ok(result.hasOwnA, "Should have found own field 'a'");
                ok(result.hasOwnC, "Should have found own field 'c'");
                ok(! result.hasOwnZ, "Should not have found own field 'z'");
                contAndStart(cont);
            });
        });
    });

});
