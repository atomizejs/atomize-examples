// atomize-translate queue.js queue-compat.js atomize console

var myPos, writer, next = 0, value, atomize;
function enqueue (e, cont) {
    atomize.atomically(function () {
        var obj = atomize.lift({val: e});
        if (atomize.has(atomize.root, "queue")) {
            atomize.assign(atomize.access(atomize.root, "queue"), "next", obj);
        }
        atomize.assign(atomize.root, "queue", obj);
    }, function (result) {
        cont();
    });
}
function dequeue (cont) {
    if (undefined === myPos) {
        atomize.atomically(function () {
            if (!atomize.has(atomize.root, "queue")) {
                atomize.retry();
            }
            return [atomize.access(atomize.root, "queue"), atomize.access(atomize.access(atomize.root, "queue"), "val")];
        }, function (elem) {
            myPos = atomize.access(elem, 0);
            cont(atomize.access(elem, 1));
        });
    } else {
        atomize.atomically(function () {
            if (!atomize.has(myPos, "next")) {
                atomize.retry();
            }
            return [atomize.access(myPos, "next"), atomize.access(atomize.access(myPos, "next"), "val")];
        }, function (elem) {
            myPos = atomize.access(elem, 0);
            cont(atomize.access(elem, 1));
        });
    }
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
    atomize = new Atomize();
    atomize.onAuthenticated = function () {
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
    };
    atomize.connect();
}
