var Speaker = require('speaker');

var audioProcessor = function(rtspServer) {
	var self = this;

	var speaker = new Speaker({
	  channels: 2,          // 2 channels
	  bitDepth: 16,         // 16-bit samples
	  sampleRate: 44100    // 44,100 Hz sample rate
	});

	self.process = function(bytes, sequenceNumber) {
		speaker.write(bytes);
	};

};

module.exports = audioProcessor;