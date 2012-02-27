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
console.log(" [*] Listening on 0.0.0.0:" + port);
server.listen(port, '0.0.0.0');
