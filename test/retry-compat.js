// atomize-translate retry.js retry-compat.js atomize console

function start () {
    var atomize = new Atomize("http://localhost:9999/atomize");
    atomize.atomically(function () {
        if (undefined === atomize.access(atomize.root, "clients")) {
            atomize.assign(atomize.root, "clients", 1);
            return true;
        } else {
            atomize.assign(atomize.root, "clients", atomize.access(atomize.root, "clients") + 1);
            return false;
        }
    }, function (writer) {
        atomize.atomically(function () {
            if (writer) {
                if (1 === atomize.access(atomize.root, "clients")) {
                    atomize.retry();
                } else {
                    atomize.assign(atomize.root, "notified", atomize.lift(Date()));
                    atomize.erase(atomize.root, "clients");
                    return "notified others";
                }
            } else {
                if (undefined === atomize.access(atomize.root, "notified")) {
                    atomize.retry();
                } else {
                    return atomize.access(atomize.access(atomize.root, "notified"), "toString")();
                }
            }
        }, function (result) {
            console.log(result);
        });
    });
}
