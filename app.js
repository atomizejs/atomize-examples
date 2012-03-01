/*global process, require */
/*jslint devel: true */

var http = require('http');
var atomize = require('atomize-server');
var httpServer = http.createServer();
var port = 9999;
var port_index = process.argv.indexOf('--port');
if (port_index > -1) {
    port = process.argv[port_index + 1];
}

var atomizeServer = atomize.create(httpServer, '[/]atomize', {wibble: true});
var atomizeClient = atomizeServer.client();
atomizeClient.atomically(function () {
    atomizeClient.root.clients = atomizeClient.lift({});
}, function () {
    atomizeServer.on('connection', function (client) {
        atomizeClient.atomically(function () {
            atomizeClient.root.clients[client.connection.id] = atomizeClient.lift({});
        }, function () {
            console.log("New connection id: " + client.connection.id);

            client.on('close', function (client) {
                atomizeClient.atomically(function () {
                    delete atomizeClient.root.clients[client.connection.id];
                }, function () {
                    console.log("Connection death: " + client.connection.id);
                });
            });

            client.isAuthenticated = true;
        });
    });
});
console.log(" [*] Listening on 0.0.0.0:" + port);
httpServer.listen(port, '0.0.0.0');
