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

var atomizeServer = atomize.create(httpServer, '[/]atomize');
var atomizeClient = atomizeServer.client();

atomizeClient.atomically(function () {
    atomizeClient.root.clients = atomizeClient.lift({server: {}});
}, function () {
    atomizeServer.on('connection', function (client) {

        client.on('close', function (client) {
            atomizeClient.atomically(function () {
                delete atomizeClient.root.clients[client.connection.id];
            }, function () {
                console.log("Connection death: " + client.connection.id);
            });
        });

        // Example of how to implement authentication
        /* client.on('data', function (message, client) {
            var text = JSON.parse(message).text;
            if (text === "wibble") {
                client.connection.write(JSON.stringify({text: "wobble"}));

                atomizeClient.atomically(function () {
                    atomizeClient.root.clients[client.connection.id] = atomizeClient.lift({});
                }, function () {
                    console.log("New connection id: " + client.connection.id);
                    client.isAuthenticated = true;
                });
            } else {
                client.connection.write(JSON.stringify({text: "denied"}));
            }
        }); */

        console.log("New connection id: " + client.connection.id);
        client.isAuthenticated = true;
    });
});

console.log(" [*] Listening on 0.0.0.0:" + port);
httpServer.listen(port, '0.0.0.0');
