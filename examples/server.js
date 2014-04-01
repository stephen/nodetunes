"use strict";

var AirTunesServer = require('../index');
var Speaker = require('speaker');

var speaker = new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
});
var server = new AirTunesServer();

server.on('clientConnected', function(audioStream) {
	audioStream.pipe(speaker);
});

server.start();