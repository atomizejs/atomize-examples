// atomize-translate retry.js retry-compat.js atomize console

function start() {
    var atomize = new Atomize("http://localhost:9999/atomize");
    atomize.onAuthenticated = function () {
        atomize.atomically(function () {
            if (undefined === atomize.root.retryDecider) {
                atomize.root.retryDecider = 1;
                return true;
            } else {
                atomize.root.retryDecider += 1;
                return false
            }
        }, function (writer) {
            atomize.atomically(function () {
                if (writer) {
                    if (1 === atomize.root.retryDecider) {
                        atomize.retry();
                    } else {
                        atomize.root.notified = atomize.lift(Date());
                        delete atomize.root.retryDecider
                        return "notified others";
                    }
                } else {
                    if (undefined === atomize.root.notified) {
                        atomize.retry();
                    } else {
                        return atomize.root.notified.toString();
                    }
                }
            }, function (result) {
                console.log(result)
            });
        });
    };
    atomize.connect();
}
