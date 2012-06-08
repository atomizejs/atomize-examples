// atomize-translate retry.js retry-compat.js atomize console
var atomize;
function start () {
    atomize = new Atomize();

    atomize.onAuthenticated = function () {
        atomize.atomically(function () {
            if (undefined === atomize.access(atomize.root, "retryDecider")) {
                atomize.assign(atomize.root, "retryDecider", 1);
                return true;
            } else {
                atomize.assign(atomize.root, "retryDecider", atomize.access(atomize.root, "retryDecider") + 1);
                return false;
            }
        }, function (writer) {
            atomize.atomically(function () {
                if (writer) {
                    if (1 === atomize.access(atomize.root, "retryDecider")) {
                        atomize.retry();
                    } else {
                        atomize.assign(atomize.root, "notified", atomize.lift(Date()));
                        atomize.erase(atomize.root, "retryDecider");
                        return "notified others";
                    }
                } else {
                    if (undefined === atomize.access(atomize.root, "notified")) {
                        atomize.retry();
                    } else {
                        return "" + atomize.access(atomize.root, "notified");
                    }
                }
            }, function (result) {
                console.log(result);
            });
        });
    };
    atomize.connect();
}
