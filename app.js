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

var atomizeServer = atomize.create(httpServer, '[/]atomize', {});
atomizeServer.on('connection', function (client) {
    console.log("New connection id: " + client.connection.id);
    client.isAuthenticated = true;
});
var atomizeClient = atomizeServer.client();
console.log(" [*] Listening on 0.0.0.0:" + port);
httpServer.listen(port, '0.0.0.0');
