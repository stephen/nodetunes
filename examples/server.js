'use strict';

var AirTunesServer = require('../index');
var Speaker = require('speaker');

var speaker = new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100,
});
var server = new AirTunesServer({ serverName: 'NodeTunes Speaker' });

server.on('clientConnected', function(stream) {
  stream.pipe(speaker);
});

/**
* Uses Protocol Codes - not so human readable
server.on('metadataChange', function (metadata) {
  console.log(JSON.stringify(metadata, null, "    "));
})
*/

/**
* Uses DAAP Names for keys - human readable
server.on('metadataChangePretty', function (metadata) {
  console.log(JSON.stringify(metadata, null, "    "));
})
*/

server.start();
