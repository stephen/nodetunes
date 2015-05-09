"use strict";
var AirTunesServer = require('../index');
var Speaker = require('speaker');

var speaker = new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
});
var server = new AirTunesServer({ serverName: 'NodeTunes Speaker', verbose: process.env.VERBOSE});

server.on('clientConnected', function(stream) {
	stream.pipe(speaker);
});

server.start();
