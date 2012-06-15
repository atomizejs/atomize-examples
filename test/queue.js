// atomize-translate queue.js queue-compat.js atomize console

/*global atomize */
/*jslint browser: true, devel: true */

var myPos,
    writer,
    next = 0,
    value,
    atomize;

function enqueue(e, cont) {
    atomize.atomically(function () {
        var obj = atomize.lift({val: e});
        if ('queue' in atomize.root) {
            atomize.root.queue.next = obj;
        }
        atomize.root.queue = obj;
    }, function (result) {
        cont();
    });
}

function dequeue(cont) {
    if (undefined === myPos) {
        atomize.atomically(function () {
            if (! ('queue' in atomize.root)) {
                atomize.retry();
            }
            return [atomize.root.queue, atomize.root.queue.val];
        }, function (elem) {
            myPos = elem[0];
            cont(elem[1]);
        });
    } else {
        atomize.atomically(function () {
            if (! ('next' in myPos)) {
                atomize.retry();
            }
            return [myPos.next, myPos.next.val];
        }, function (elem) {
            myPos = elem[0];
            cont(elem[1]);
        });
    }
}

function write() {
    enqueue(next, function (e) { next += 1; loop(); });
}

function read() {
    dequeue(function (result) { value = result; loop(); });
}

function loop() {
    if (writer) {
        setTimeout("write();", 1);
    } else {
        setTimeout("read();", 1);
    }
}

function log() {
    if (writer) {
        console.log("Writing: " + next);
    } else {
        console.log("Dequeued: " + value);
    }
    debug();
}

function debug() {
    setTimeout("log();", 1000);
}

function start() {
    atomize = new Atomize();
    atomize.onAuthenticated = function () {
        atomize.atomically(function () {
            if (undefined === atomize.root.queueWriter) {
                atomize.root.queueWriter = "taken";
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
