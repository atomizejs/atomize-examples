// atomize-translate retry.js retry-compat.js atomize console

function start() {
    var atomize = new Atomize("http://localhost:9999/atomize");
    atomize.atomically(function () {
        if (undefined === atomize.root.clients) {
            atomize.root.clients = 1;
            return true;
        } else {
            atomize.root.clients += 1;
            return false
        }
    }, function (writer) {
        atomize.atomically(function () {
            if (writer) {
                if (1 === atomize.root.clients) {
                    atomize.retry();
                } else {
                    atomize.root.notified = atomize.lift(Date());
                    delete atomize.root.clients
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
}
