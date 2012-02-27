// atomize-translate queue.js queue-compat.js atomize console

var registered = false, created = false, myPos, writer, next = 0, value, atomize;
function create (e, cont) {
    if (created) {
        cont(false);
    } else {
        atomize.atomically(function () {
            if (undefined === atomize.access(atomize.root, "queue")) {
                atomize.assign(atomize.root, "queue", atomize.lift({}));
            }
            if (undefined === atomize.access(atomize.access(atomize.root, "queue"), "head")) {
                atomize.assign(atomize.access(atomize.root, "queue"), "head", atomize.lift({val: atomize.lift(e), next: atomize.lift({})}));
                return true;
            } else {
                return false;
            }
        }, function (c) {
            if (c) {
                created = true;
            }
            cont(c);
        });
    }
}
function enqueue (e, cont) {
    create(e, function (c) {
        if (c) {
            cont();
        } else {
            atomize.atomically(function () {
                var obj = atomize.access(atomize.access(atomize.access(atomize.root, "queue"), "head"), "next");
                atomize.assign(obj, "next", atomize.lift({}));
                atomize.assign(obj, "val", atomize.lift(e));
                atomize.assign(atomize.access(atomize.root, "queue"), "head", atomize.access(atomize.access(atomize.access(atomize.root, "queue"), "head"), "next"));
            }, function (result) {
                cont();
            });
        }
    });
}
function register (cont) {
    if (registered) {
        cont();
    } else {
        atomize.atomically(function () {
            if (undefined === atomize.access(atomize.root, "queue")) {
                atomize.assign(atomize.root, "queue", atomize.lift({}));
            }
        }, function (result) {
            registered = true;
            atomize.atomically(function () {
                if (undefined === atomize.access(atomize.access(atomize.root, "queue"), "head")) {
                    atomize.retry();
                }
                if (undefined === myPos) {
                    myPos = atomize.access(atomize.access(atomize.root, "queue"), "head");
                }
            }, function (result) {
                cont();
            });
        });
    }
}
function dequeue (cont) {
    register(function () {
        atomize.atomically(function () {
            var result;
            if (!atomize.access(atomize.access({}, "hasOwnProperty"), "call")(myPos, "val")) {
                atomize.retry();
            }
            result = atomize.access(myPos, "val");
            myPos = atomize.access(myPos, "next");
            return result;
        }, cont);
    });
}
function write () {
    enqueue(next, function (e) {
        next += 1;
        loop();
    });
}
function read () {
    dequeue(function (result) {
        value = result;
        loop();
    });
}
function loop () {
    if (writer) {
        setTimeout("write();", 1);
    } else {
        setTimeout("read();", 1);
    }
}
function log () {
    if (writer) {
        console.log("Writing: " + next);
    } else {
        console.log("Dequeued: " + value);
    }
    debug();
}
function debug () {
    setTimeout("log();", 1000);
}
function start () {
    atomize = new Atomize("http://localhost:9999/atomize");
    atomize.atomically(function () {
        if (undefined === atomize.access(atomize.root, "queueWriter")) {
            atomize.assign(atomize.root, "queueWriter", "taken");
            return true;
        } else {
            return false;
        }
    }, function (w) {
        writer = w;
        loop();
        debug();
    });
}
