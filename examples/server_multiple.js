"use strict";

var AirTunesServer = require('../index');
var Speaker = require('speaker');

var server1 = new AirTunesServer({ serverName: 'NodeTunes 1' });
var server2 = new AirTunesServer({ serverName: 'NodeTunes 2' });

server1.on('clientConnected', function(stream) {
	stream.on('data', function(d) {
		process.stdout.write('\rWriting for Server 1: ' + d.length + ' bytes @ ' + new Date().getTime() + '\t');
	})
});

server2.on('clientConnected', function(stream) {
	stream.on('data', function(d) {
		process.stdout.write('\rWriting for Server 2: ' + d.length + ' bytes @ ' + new Date().getTime() + '\t');
	})
});

server1.start();
server2.start();