/*global process, require */
/*jslint devel: true */

var http = require('http');
var atomizeServer = require('atomize-server');
var server = http.createServer();
var port = 9999;
var port_index = process.argv.indexOf('--port');
if (port_index > -1) {
    port = process.argv[port_index + 1];
}

atomizeServer.create(server, '[/]atomize');

var atomize = atomizeServer.atomize;

function onchange (old) {
    atomize.atomically(
        function () {
            if (undefined === atomize.root.notified || old === atomize.root.notified) {
                atomize.retry();
            } else {
                return atomize.root.notified.toString();
            }
        }, function (result) {
            console.log(result);
            onchange(result);
        });
}

onchange(undefined);

console.log(" [*] Listening on 0.0.0.0:" + port);
server.listen(port, '0.0.0.0');
