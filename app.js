/*global process, require */
/*jslint devel: true */

var express = require('express');
var atomize = require('atomize-server');
var path = require('path');
var app = express.createServer();
var port = 9999;
var port_index = process.argv.indexOf('--port');
if (port_index > -1) {
    port = process.argv[port_index + 1];
}

app.configure(function(){
    app.use(express.logger('dev'));
    app.use(app.router);
    app.use(express.static(__dirname));
});

function serveJS (fileName, packageName) {
    var p;
    try {
        p = require.resolve(packageName);
        p = path.dirname(p);
        p = path.join(path.join(p, 'lib'), fileName);
    } catch (err) {
        p = require.resolve('atomize-server');
        p = path.dirname(p);
        p = path.join(
                path.join(
                    path.join(
                        path.join(p, 'node_modules'),
                        packageName),
                    'lib'),
                fileName);
    }
    app.get('/' + fileName, function (req, res) {
        res.sendfile(p);
    });
}

serveJS('atomize.js', 'atomize-client');
serveJS('cereal.js',  'cereal');
serveJS('compat.js',  'atomize-client');

var atomizeServer = atomize.create(app, '[/]atomize');
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
        // disable this next line if you want to do some sort of real auth
        client.isAuthenticated = true;
    });
});

console.log(" [*] Listening on 0.0.0.0:" + port);
app.listen(port);
