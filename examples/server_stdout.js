"use strict";

var AirTunesServer = require('../index');
var Speaker = require('speaker');

var server = new AirTunesServer({ serverName: 'NodeTunes Stdout' });

server.on('clientConnected', function(stream) {
	stream.pipe(process.stdout);
});

server.start();
