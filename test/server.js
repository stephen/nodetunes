var AirTunesServer = require('../index');
var Speaker = require('speaker');

var server = new AirTunesServer(new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
}));

server.start();

server.on('volumeChange', function(vol) {
	console.log(vol);
});