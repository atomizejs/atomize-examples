// atomize-translate bomberman.js bomberman-compat.js atomize Bomberman Player Cell Bomb this

var atomize, bomberman, canvas, ctx, clientWidth = 0, clientHeight = 0;
function Cell (bomberman, x, y, raw) {
    var self = this;
    this.bomberman = bomberman;
    this.x = x;
    this.y = y;
    this.raw = raw;
    this.clearCount = 0;
    if (((((x === 0) || ((x + 1) === atomize.access(bomberman, "width"))) || (y === 0)) || ((y + 1) === atomize.access(bomberman, "height"))) || (((x % 2) === 0) && ((y % 2) === 0))) {
        this.wall = true;
    }
    atomize.atomically(function () {
        if (undefined === atomize.access(atomize.access(self, "raw"), "wall")) {
            atomize.assign(atomize.access(self, "raw"), "wall", atomize.access(self, "wall"));
            atomize.assign(atomize.access(self, "raw"), "fatal", atomize.access(self, "fatal"));
        }
    });
}
Cell.prototype = {watching: false, wall: false, fatal: false, fatalTimer: 1000, setFatal: function () {
    var self, occupant, fun, bomb;
    self = this;
    atomize.atomically(function () {
        atomize.assign(atomize.access(self, "raw"), "fatal", true);
        occupant = atomize.access(atomize.access(self, "raw"), "occupant");
        atomize.erase(atomize.access(self, "raw"), "occupant");
        return occupant;
    }, function (occupant) {
        fun = function () {
            atomize.access(self, "clearFatal")();
        };
        setTimeout(fun, atomize.access(self, "fatalTimer"));
        atomize.assign(self, "clearCount", atomize.access(self, "clearCount") + 1);
        if (((undefined !== occupant) && ("bomb" === atomize.access(occupant, "type"))) && (undefined !== atomize.access(occupant, "id"))) {
            bomb = atomize.access(atomize.access(atomize.access(self, "bomberman"), "bombs"), atomize.access(occupant, "id"));
            if (undefined != bomb) {
                atomize.access(bomb, "explode")();
            }
        }
    });
}, clearFatal: function () {
    var self = this;
    atomize.assign(self, "clearCount", atomize.access(self, "clearCount") - 1);
    if (atomize.access(self, "clearCount") === 0) {
        atomize.atomically(function () {
            atomize.assign(atomize.access(self, "raw"), "fatal", false);
        });
    }
}, render: function (ctx, scale) {
    var offset;
    if (this.wall) {
        atomize.access(ctx, "beginPath")();
        atomize.assign(ctx, "fillStyle", "#000000");
        atomize.access(ctx, "fillRect")(this.x * scale, this.y * scale, scale, scale);
        atomize.access(ctx, "closePath")();
    } else
        if (this.fatal) {
        offset = (scale * 0.05);
        atomize.access(ctx, "beginPath")();
        atomize.assign(ctx, "fillStyle", "#E00000");
        atomize.access(ctx, "fillRect")(offset + (this.x * scale), offset + (this.y * scale), scale * 0.9, scale * 0.9);
        atomize.access(ctx, "closePath")();
    }
}, occupied: function () {
    return this.wall || (undefined !== this.occupant);
}, placeBomb: function (bomb, cont) {
    var self = this;
    atomize.atomically(function () {
        if ((undefined === atomize.access(atomize.access(self, "raw"), "occupant")) || ("player" === atomize.access(atomize.access(atomize.access(self, "raw"), "occupant"), "type"))) {
            atomize.assign(atomize.access(self, "raw"), "occupant", atomize.access(bomb, "raw"));
            return true;
        } else {
            return false;
        }
    }, cont);
}, occupy: function (player, cont) {
    var self = this;
    if (atomize.access(self, "wall")) {
        cont(false);
    } else {
        atomize.atomically(function () {
            if (atomize.access(atomize.access(self, "raw"), "fatal")) {
                return false;
            } else
                if (undefined === atomize.access(atomize.access(self, "raw"), "occupant")) {
                atomize.assign(atomize.access(self, "raw"), "occupant", atomize.access(player, "raw"));
                return true;
            } else {
                return false;
            }
        }, cont);
    }
}, unoccupy: function (player) {
    var self = this;
    atomize.atomically(function () {
        if (atomize.access(atomize.access(self, "raw"), "occupant") === atomize.access(player, "raw")) {
            atomize.erase(atomize.access(self, "raw"), "occupant");
        }
    });
}, watch: function () {
    var self, fun;
    if (this.wall || this.watching) {
        return;
    }
    this.watching = true;
    self = this;
    fun = function (props) {
        atomize.atomically(function () {
            if ((atomize.access(props, "occupant") === atomize.access(atomize.access(self, "raw"), "occupant")) && (atomize.access(props, "fatal") === atomize.access(atomize.access(self, "raw"), "fatal"))) {
                atomize.retry();
            } else {
                return {occupant: atomize.access(atomize.access(self, "raw"), "occupant"), fatal: atomize.access(atomize.access(self, "raw"), "fatal")};
            }
        }, function (props) {
            if (undefined === atomize.access(props, "occupant")) {
                atomize.erase(self, "occupant");
            } else {
                atomize.assign(self, "occupant", atomize.access(props, "occupant"));
            }
            atomize.assign(self, "fatal", atomize.access(props, "fatal"));
            fun({occupant: atomize.access(self, "occupant"), fatal: atomize.access(self, "fatal")});
        });
    };
    fun({occupant: atomize.access(self, "occupant"), fatal: atomize.access(self, "fatal")});
}};
function Bomb (bomberman, raw) {
    this.bomberman = bomberman;
    this.x = -1;
    this.y = -1;
    this.raw = raw;
}
Bomb.prototype = {exploded: false, timer: 1500, startTimer: function () {
    var self, explode;
    self = this;
    explode = function () {
        atomize.access(self, "explode")();
    };
    setTimeout(explode, atomize.access(self, "timer"));
}, explode: function () {
    var self, exploded, i, cells;
    self = this;
    atomize.atomically(function () {
        var alreadyExploded = atomize.access(atomize.access(self, "raw"), "exploded");
        atomize.assign(atomize.access(self, "raw"), "exploded", true);
        return alreadyExploded;
    }, function (alreadyExploded) {
        atomize.assign(self, "exploded", true);
        atomize.access(atomize.access(self, "bomberman"), "deleteBomb")(self);
        if (alreadyExploded) {
            return;
        }
        cells = [atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y"))];
        if (!atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") - 1), "wall")) {
            atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") - 1));
            if ((undefined !== atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") - 2)) && !atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") - 2), "wall")) {
                atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") - 2));
            }
        }
        if (!atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") + 1), "wall")) {
            atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") + 1));
            if ((undefined !== atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") + 2)) && !atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") + 2), "wall")) {
                atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x")), atomize.access(self, "y") + 2));
            }
        }
        if (!atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") - 1), atomize.access(self, "y")), "wall")) {
            atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") - 1), atomize.access(self, "y")));
            if ((undefined !== atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") - 2)) && !atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") - 2), atomize.access(self, "y")), "wall")) {
                atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") - 2), atomize.access(self, "y")));
            }
        }
        if (!atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") + 1), atomize.access(self, "y")), "wall")) {
            atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") + 1), atomize.access(self, "y")));
            if ((undefined !== atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") + 2)) && !atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") + 2), atomize.access(self, "y")), "wall")) {
                atomize.access(cells, "push")(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), atomize.access(self, "x") + 2), atomize.access(self, "y")));
            }
        }
        for (i = 0; i < atomize.access(cells, "length"); i += 1) {
            atomize.access(atomize.access(cells, i), "setFatal")();
        }
    });
}, maybeInit: function () {
    var self = this;
    atomize.atomically(function () {
        return {x: atomize.access(atomize.access(self, "raw"), "x"), y: atomize.access(atomize.access(self, "raw"), "y")};
    }, function (pos) {
        atomize.assign(self, "x", atomize.access(pos, "x"));
        atomize.assign(self, "y", atomize.access(pos, "y"));
        atomize.atomically(function () {
            if (undefined === atomize.access(atomize.access(self, "raw"), "id")) {
                atomize.retry();
            } else {
                return atomize.access(atomize.access(self, "raw"), "id");
            }
        }, function (id) {
            atomize.assign(self, "id", id);
        });
    });
}, render: function (ctx, scale) {
    x = ((this.x + 0.5) * scale);
    y = ((this.y + 0.5) * scale);
    atomize.access(ctx, "beginPath")();
    atomize.assign(ctx, "fillStyle", "#A00000");
    atomize.access(ctx, "arc")(x, y, 0.45 * scale, 0, atomize.access(Math, "PI") * 2, true);
    atomize.access(ctx, "closePath")();
    atomize.access(ctx, "fill")();
}};
function Player (bomberman, raw) {
    this.bomberman = bomberman;
    this.raw = raw;
    this.x = -1;
    this.y = -1;
    this.xCell = -1;
    this.yCell = -1;
    this.bombs = [];
}
Player.prototype = {watching: false, ready: false, dead: false, respawnTime: 5000, blocked: false, north: function () {
    this.xv = 0;
    this.yv = -0.1;
}, south: function () {
    this.xv = 0;
    this.yv = 0.1;
}, east: function () {
    this.xv = 0.1;
    this.yv = 0;
}, west: function () {
    this.xv = -0.1;
    this.yv = 0;
}, dropBomb: function () {
    var bombs, i, bomb, fun, self;
    bombs = [];
    for (i = 0; i < atomize.access(this.bombs, "length"); i += 1) {
        if (!atomize.access(atomize.access(this.bombs, i), "exploded")) {
            atomize.access(bombs, "push")(atomize.access(this.bombs, i));
        }
    }
    this.bombs = bombs;
    if (atomize.access(this.bombs, "length") > 4) {
        return;
    }
    bomb = new Bomb(this.bomberman, atomize.lift({type: "bomb", x: this.xCell, y: this.yCell, exploded: false}));
    atomize.access(bomb, "maybeInit")();
    self = this;
    fun = function (success) {
        if (success) {
            atomize.access(bomb, "startTimer")();
            atomize.access(atomize.access(self, "bombs"), "push")(bomb);
        }
    } , atomize.access(this.bomberman, "dropBomb")(this.xCell, this.yCell, bomb, fun);
}, render: function (ctx, scale) {
    var x, y;
    if (this.dead) {
        return;
    }
    x = (this.x * scale);
    y = (this.y * scale);
    atomize.access(ctx, "beginPath")();
    if (this === atomize.access(this.bomberman, "me")) {
        atomize.assign(ctx, "fillStyle", "#00D0D0");
    } else {
        atomize.assign(ctx, "fillStyle", "#00A000");
    }
    atomize.access(ctx, "arc")(x, y, 0.25 * scale, 0, atomize.access(Math, "PI") * 2, true);
    atomize.access(ctx, "closePath")();
    atomize.access(ctx, "fill")();
}, step: function () {
    var xNew, yNew, xCell, yCell, self, fun;
    if ((this.blocked || this.dead) || !this.ready) {
        return;
    }
    this.blocked = true;
    self = this;
    xNew = (this.x + this.xv);
    yNew = (this.y + this.yv);
    xCell = atomize.access(Math, "floor")(xNew);
    yCell = atomize.access(Math, "floor")(yNew);
    if (atomize.access(atomize.access(atomize.access(atomize.access(this.bomberman, "grid"), this.xCell), this.yCell), "fatal") || atomize.access(atomize.access(atomize.access(atomize.access(this.bomberman, "grid"), xCell), yCell), "fatal")) {
        atomize.atomically(function () {
            atomize.assign(atomize.access(self, "raw"), "dead", true);
            atomize.access(atomize.access(self, "bomberman"), "unoccupy")(atomize.access(self, "xCell"), atomize.access(self, "yCell"), self);
        }, function () {
            atomize.assign(self, "dead", true);
            atomize.assign(self, "blocked", false);
            fun = function () {
                atomize.access(self, "spawn")();
            };
            setTimeout(fun, atomize.access(self, "respawnTime"));
        });
        return;
    }
    if ((xCell !== this.xCell) || (yCell !== this.yCell)) {
        if (atomize.access(atomize.access(atomize.access(atomize.access(this.bomberman, "grid"), xCell), yCell), "occupied")()) {
            this.blocked = false;
            return;
        } else {
            self = this;
            fun = function (success) {
                if (success) {
                    atomize.access(atomize.access(self, "bomberman"), "unoccupy")(atomize.access(self, "xCell"), atomize.access(self, "yCell"), self);
                    atomize.assign(self, "xCell", xCell);
                    atomize.assign(self, "yCell", yCell);
                    atomize.assign(self, "x", xNew);
                    atomize.assign(self, "y", yNew);
                    atomize.atomically(function () {
                        atomize.assign(atomize.access(self, "raw"), "x", xNew);
                        atomize.assign(atomize.access(self, "raw"), "y", yNew);
                    }, function () {
                        atomize.assign(self, "blocked", false);
                    });
                }
            };
            atomize.access(this.bomberman, "occupy")(xCell, yCell, self, fun);
        }
    } else {
        atomize.atomically(function () {
            atomize.assign(atomize.access(self, "raw"), "x", xNew);
            atomize.assign(atomize.access(self, "raw"), "y", yNew);
        }, function () {
            atomize.assign(self, "x", xNew);
            atomize.assign(self, "y", yNew);
            atomize.assign(self, "blocked", false);
        });
    }
}, watch: function () {
    var self, fun;
    if (this.watching) {
        return;
    }
    this.watching = true;
    self = this;
    fun = function () {
        atomize.atomically(function () {
            if (((atomize.access(self, "x") === atomize.access(atomize.access(self, "raw"), "x")) && (atomize.access(self, "y") === atomize.access(atomize.access(self, "raw"), "y"))) && (atomize.access(self, "dead") === atomize.access(atomize.access(self, "raw"), "dead"))) {
                atomize.retry();
            } else {
                return {x: atomize.access(atomize.access(self, "raw"), "x"), y: atomize.access(atomize.access(self, "raw"), "y"), dead: atomize.access(atomize.access(self, "raw"), "dead")};
            }
        }, function (pos) {
            atomize.assign(self, "x", atomize.access(pos, "x"));
            atomize.assign(self, "y", atomize.access(pos, "y"));
            atomize.assign(self, "dead", atomize.access(pos, "dead"));
            fun();
        });
    };
    fun();
}, spawn: function () {
    var self, fun, x, y, directions, keys;
    self = this;
    x = atomize.access(Math, "round")((atomize.access(atomize.access(self, "bomberman"), "width") - 1) * atomize.access(Math, "random")());
    y = atomize.access(Math, "round")((atomize.access(atomize.access(self, "bomberman"), "height") - 1) * atomize.access(Math, "random")());
    fun = function (success) {
        if (success) {
            atomize.atomically(function () {
                atomize.assign(atomize.access(self, "raw"), "x", x + 0.5);
                atomize.assign(atomize.access(self, "raw"), "y", y + 0.5);
                atomize.assign(atomize.access(self, "raw"), "dead", false);
            }, function () {
                atomize.assign(self, "x", x + 0.5);
                atomize.assign(self, "y", y + 0.5);
                atomize.assign(self, "xCell", x);
                atomize.assign(self, "yCell", y);
                atomize.assign(self, "ready", true);
                atomize.assign(self, "dead", false);
                directions = {north: function () {
                    atomize.access(self, "north")();
                }, south: function () {
                    atomize.access(self, "south")();
                }, east: function () {
                    atomize.access(self, "east")();
                }, west: function () {
                    atomize.access(self, "west")();
                }};
                if (atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), x - 1), y), "wall")) {
                    atomize.erase(directions, "west");
                }
                if (atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), x + 1), y), "wall")) {
                    atomize.erase(directions, "east");
                }
                if (atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), x), y - 1), "wall")) {
                    atomize.erase(directions, "north");
                }
                if (atomize.access(atomize.access(atomize.access(atomize.access(atomize.access(self, "bomberman"), "grid"), x), y + 1), "wall")) {
                    atomize.erase(directions, "south");
                }
                keys = atomize.access(Object, "keys")(directions);
                atomize.access(directions, atomize.access(keys, atomize.access(Math, "round")((atomize.access(keys, "length") - 1) * atomize.access(Math, "random")())))();
            });
        } else {
            atomize.access(self, "spawn")();
        }
    };
    atomize.access(atomize.access(self, "bomberman"), "occupy")(x, y, self, fun);
}};
function Bomberman (raw) {
    this.raw = raw;
    this.grid = [];
    this.players = {};
    this.bombs = {};
}
Bomberman.prototype = {width: 25, height: 25, dropBomb: function (x, y, bomb, cont) {
    var self, fun;
    self = this;
    fun = function (success) {
        if (success) {
            atomize.atomically(function () {
                atomize.assign(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount", atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount") + 1);
                atomize.assign(atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "bombs"), atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount"), atomize.access(bomb, "raw"));
                atomize.assign(atomize.access(bomb, "raw"), "id", atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount"));
                return true;
            }, cont);
        } else {
            cont(false);
        }
    };
    atomize.access(atomize.access(atomize.access(atomize.access(self, "grid"), x), y), "placeBomb")(bomb, fun);
}, deleteBomb: function (bomb) {
    var self = this;
    atomize.atomically(function () {
        if (atomize.access(bomb, "raw") === atomize.access(atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "bombs"), atomize.access(bomb, "id"))) {
            atomize.assign(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount", atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount") + 1);
            atomize.erase(atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "bombs"), atomize.access(bomb, "id"));
        }
    });
}, occupy: function (x, y, player, cont) {
    atomize.access(atomize.access(atomize.access(this.grid, x), y), "occupy")(player, cont);
}, unoccupy: function (x, y, player) {
    atomize.access(atomize.access(atomize.access(this.grid, x), y), "unoccupy")(player);
}, watchGrid: function () {
    var x, y;
    for (x = 0; x < atomize.access(this.grid, "length"); x += 1) {
        for (y = 0; y < atomize.access(atomize.access(this.grid, x), "length"); y += 1) {
            atomize.access(atomize.access(atomize.access(this.grid, x), y), "watch")();
        }
    }
}, watchPlayers: function () {
    var fun, self, players, keys, i;
    self = this;
    fun = function (eventCount) {
        atomize.atomically(function () {
            if (atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "eventCount") === eventCount) {
                atomize.retry();
            } else {
                players = {};
                keys = atomize.access(Object, "keys")(atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "players"));
                for (i = 0; i < atomize.access(keys, "length"); i += 1) {
                    atomize.assign(players, atomize.access(keys, i), atomize.access(atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "players"), atomize.access(keys, i)));
                }
                return {players: players, eventCount: atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "eventCount")};
            }
        }, function (result) {
            atomize.assign(self, "players", {});
            keys = atomize.access(Object, "keys")(atomize.access(result, "players"));
            for (i = 0; i < atomize.access(keys, "length"); i += 1) {
                if (atomize.access(atomize.access(result, "players"), atomize.access(keys, i)) === atomize.access(atomize.access(self, "me"), "raw")) {
                    atomize.assign(atomize.access(self, "players"), atomize.access(keys, i), atomize.access(self, "me"));
                } else {
                    atomize.assign(atomize.access(self, "players"), atomize.access(keys, i), new Player(self, atomize.access(atomize.access(result, "players"), atomize.access(keys, i))));
                    atomize.access(atomize.access(atomize.access(self, "players"), atomize.access(keys, i)), "watch")();
                }
            }
            fun(atomize.access(result, "eventCount"));
        });
    };
    fun(0);
}, watchBombs: function () {
    var fun, self, bombs, keys, i;
    self = this;
    fun = function (eventCount) {
        atomize.atomically(function () {
            if (atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount") === eventCount) {
                atomize.retry();
            } else {
                bombs = {};
                keys = atomize.access(Object, "keys")(atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "bombs"));
                for (i = 0; i < atomize.access(keys, "length"); i += 1) {
                    atomize.assign(bombs, atomize.access(keys, i), atomize.access(atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "bombs"), atomize.access(keys, i)));
                }
                return {bombs: bombs, eventCount: atomize.access(atomize.access(atomize.access(self, "raw"), "bombs"), "eventCount")};
            }
        }, function (result) {
            atomize.assign(self, "bombs", {});
            keys = atomize.access(Object, "keys")(atomize.access(result, "bombs"));
            for (i = 0; i < atomize.access(keys, "length"); i += 1) {
                atomize.assign(atomize.access(self, "bombs"), atomize.access(keys, i), new Bomb(self, atomize.access(atomize.access(result, "bombs"), atomize.access(keys, i))));
                atomize.access(atomize.access(atomize.access(self, "bombs"), atomize.access(keys, i)), "maybeInit")();
            }
            fun(atomize.access(result, "eventCount"));
        });
    };
    fun(0);
}, maybeInit: function () {
    var self, x, y, raw, cell;
    self = this;
    atomize.atomically(function () {
        if (undefined === atomize.access(atomize.access(self, "raw"), "players")) {
            atomize.assign(atomize.access(self, "raw"), "players", atomize.lift({eventCount: 0, players: {}}));
        }
        if (undefined === atomize.access(atomize.access(self, "raw"), "bombs")) {
            atomize.assign(atomize.access(self, "raw"), "bombs", atomize.lift({eventCount: 0, bombs: {}}));
        }
        if (undefined === atomize.access(atomize.access(self, "raw"), "grid")) {
            atomize.assign(atomize.access(self, "raw"), "grid", atomize.lift([]));
            for (x = 0; x < atomize.access(self, "width"); x += 1) {
                atomize.assign(atomize.access(atomize.access(self, "raw"), "grid"), x, atomize.lift([]));
                atomize.assign(atomize.access(self, "grid"), x, []);
                for (y = 0; y < atomize.access(self, "height"); y += 1) {
                    raw = atomize.lift({});
                    atomize.assign(atomize.access(atomize.access(atomize.access(self, "raw"), "grid"), x), y, raw);
                    cell = new Cell(self, x, y, raw);
                    atomize.assign(atomize.access(atomize.access(self, "grid"), x), y, cell);
                }
            }
        } else {
            atomize.assign(self, "width", atomize.access(atomize.access(atomize.access(self, "raw"), "grid"), "length"));
            atomize.assign(self, "height", atomize.access(atomize.access(atomize.access(atomize.access(self, "raw"), "grid"), 0), "length"));
            for (x = 0; x < atomize.access(self, "width"); x += 1) {
                atomize.assign(atomize.access(self, "grid"), x, []);
                for (y = 0; y < atomize.access(self, "height"); y += 1) {
                    cell = new Cell(self, x, y, atomize.access(atomize.access(atomize.access(atomize.access(self, "raw"), "grid"), x), y));
                    atomize.assign(atomize.access(atomize.access(self, "grid"), x), y, cell);
                }
            }
        }
        return atomize.lift({type: "player", dead: false});
    }, function (me) {
        atomize.access(self, "watchGrid")();
        atomize.access(self, "watchPlayers")();
        atomize.access(self, "watchBombs")();
        atomize.assign(self, "me", new Player(self, me));
        atomize.atomically(function () {
            atomize.assign(atomize.access(atomize.access(self, "raw"), "players"), "eventCount", atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "eventCount") + 1);
            atomize.assign(atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "players"), atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "eventCount"), me);
            atomize.assign(atomize.access(atomize.access(self, "me"), "raw"), "id", atomize.access(atomize.access(atomize.access(self, "raw"), "players"), "eventCount"));
        }, function () {
            atomize.access(atomize.access(self, "me"), "spawn")();
        });
    });
}, render: function (ctx) {
    var minDim, maxDim, wallLen, x, y, keys;
    minDim = atomize.access(Math, "min")(clientWidth, clientHeight);
    maxDim = atomize.access(Math, "max")(this.width, this.height);
    wallLen = (minDim / maxDim);
    for (x = 0; x < atomize.access(this.grid, "length"); x += 1) {
        for (y = 0; y < atomize.access(atomize.access(this.grid, x), "length"); y += 1) {
            atomize.access(atomize.access(atomize.access(this.grid, x), y), "render")(ctx, wallLen);
        }
    }
    keys = atomize.access(Object, "keys")(this.players);
    for (x = 0; x < atomize.access(keys, "length"); x += 1) {
        atomize.access(atomize.access(this.players, atomize.access(keys, x)), "render")(ctx, wallLen);
    }
    keys = atomize.access(Object, "keys")(this.bombs);
    for (x = 0; x < atomize.access(keys, "length"); x += 1) {
        atomize.access(atomize.access(this.bombs, atomize.access(keys, x)), "render")(ctx, wallLen);
    }
}};
function resizeCanvas () {
    var e;
    if (undefined !== canvas) {
        atomize.assign(canvas, "width", atomize.access(atomize.access(canvas, "parentNode"), "offsetWidth"));
        atomize.assign(canvas, "height", atomize.access(atomize.access(canvas, "parentNode"), "offsetHeight"));
        clientWidth = atomize.access(canvas, "width");
        clientHeight = atomize.access(canvas, "height");
        e = atomize.access(canvas, "parentNode");
        while ((undefined !== e) && (null !== e)) {
            if ((((undefined !== atomize.access(e, "clientHeight")) && (undefined !== atomize.access(e, "clientWidth"))) && (atomize.access(e, "clientHeight") > 0)) && (atomize.access(e, "clientWidth") > 0)) {
                clientHeight = atomize.access(Math, "min")(clientHeight, atomize.access(e, "clientHeight"));
                clientWidth = atomize.access(Math, "min")(clientWidth, atomize.access(e, "clientWidth"));
            }
            e = atomize.access(e, "parentNode");
        }
        canvasLeft = 10;
        canvasTop = 10;
        e = atomize.access(canvas, "parentNode");
        while ((undefined !== e) && (null !== e)) {
            if ((undefined !== atomize.access(e, "offsetLeft")) && (undefined !== atomize.access(e, "offsetTop"))) {
                canvasLeft += atomize.access(e, "offsetLeft");
                canvasTop += atomize.access(e, "offsetTop");
            }
            e = atomize.access(e, "parentNode");
        }
    }
}
function initCanvas () {
    resizeCanvas();
    try {
        ctx = atomize.access(canvas, "getContext")("2d");
    } catch (e) {
    }
    if (!ctx) {
        alert("Could not initialise 2D canvas. Change browser?");
    }
}
function drawScene () {
    atomize.access(ctx, "clearRect")(0, 0, clientWidth, clientHeight);
    atomize.assign(ctx, "lineWidth", 1);
    atomize.assign(ctx, "lineCap", "round");
    atomize.assign(ctx, "lineJoin", "round");
    atomize.assign(ctx, "strokeStyle", "black");
    atomize.access(bomberman, "render")(ctx);
}
requestAnimFrame = (function () {
    return ((((this.requestAnimationFrame || this.webkitRequestAnimationFrame) || this.mozRequestAnimationFrame) || this.oRequestAnimationFrame) || this.msRequestAnimationFrame) || function (callback, element) {
        setTimeout(callback, 1000 / 60);
    }
}());
function tick () {
    if ((undefined !== bomberman) && (undefined !== atomize.access(bomberman, "me"))) {
        atomize.access(atomize.access(bomberman, "me"), "step")();
    }
    drawScene();
    requestAnimFrame(tick);
}
function doKeyDown (event) {
    switch (atomize.access(event, "keyCode")) {
    case 38:
        atomize.access(atomize.access(bomberman, "me"), "north")();
        break;

    case 40:
        atomize.access(atomize.access(bomberman, "me"), "south")();
        break;

    case 37:
        atomize.access(atomize.access(bomberman, "me"), "west")();
        break;

    case 39:
        atomize.access(atomize.access(bomberman, "me"), "east")();
        break;

    case 32:
        atomize.access(atomize.access(bomberman, "me"), "dropBomb")();
        break;

    }
}
function init () {
    atomize = new Atomize("http://localhost:9999/atomize");
    canvas = atomize.access(document, "getElementById")("game_canvas");
    initCanvas();
    atomize.onAuthenticated = function () {
        atomize.atomically(function () {
            if (undefined === atomize.access(atomize.root, "bomberman")) {
                atomize.assign(atomize.root, "bomberman", atomize.lift({}));
            }
            return atomize.access(atomize.root, "bomberman");
        }, function (raw) {
            bomberman = new Bomberman(raw);
            atomize.access(bomberman, "maybeInit")();
            requestAnimFrame(tick);
            atomize.access(window, "addEventListener")("keydown", doKeyDown, true);
        });
    };
    atomize.connect();
}
