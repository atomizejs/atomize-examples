/*global atomize */
/*jslint browser: true, devel: true */

var registered = false;
var created = false;
var myPos;

function create(e, cont) {
    if (created) {
        cont(false);
    } else {
        atomize.atomically(function () {
            if (undefined === atomize.root.queue) {
                atomize.root.queue = atomize.lift({});
            }
            if (undefined === atomize.root.queue.head) {
                atomize.root.queue.head =
                    atomize.lift({val: atomize.lift(e), next: atomize.lift({})});
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

function enqueue(e, cont) {
    create(e, function (c) {
        if (c) {
            cont();
        } else {
            atomize.atomically(function () {
                var obj = atomize.root.queue.head.next;
                obj.next = atomize.lift({});
                obj.val = atomize.lift(e);
                atomize.root.queue.head = atomize.root.queue.head.next;
            }, function (result) {
                cont();
            });
        }
    });
}

function register(cont) {
    if (registered) {
        cont();
    } else {
        atomize.atomically(function () {
            if (undefined === atomize.root.queue) {
                atomize.root.queue = atomize.lift({});
            }
        }, function (result) {
            registered = true;
            atomize.atomically(function () {
                if (undefined === atomize.root.queue.head) {
                    atomize.retry();
                }
                if (undefined === myPos) {
                    myPos = atomize.root.queue.head;
                }
            }, function (result) {
                cont();
            });
        });
    }
}

function dequeue(cont) {
    register(function () {
        atomize.atomically(function () {
            var result;
            if (! ({}).hasOwnProperty.call(myPos, 'val')) {
                atomize.retry();
            }
            result = myPos.val;
            myPos = myPos.next;
            return result;
        }, cont);
    });
}
