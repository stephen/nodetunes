var dgram = require('dgram');
var tools = require('./rtsphelper');
var crypto = require('crypto');

var rtpServer = function(rtspServer) {
	var self = this;
	var baseServer = dgram.createSocket('udp4');
	var controlServer = dgram.createSocket('udp4');
	var timingServer = dgram.createSocket('udp4');
	var crypto = require('crypto');
	
	self.start = function() {
		baseServer.bind(rtspServer.audioPort);
		controlServer.bind(rtspServer.controlPort);
		timingServer.bind(rtspServer.timingPort);
	};

	baseServer.on('message', function(msg) {
		var meta = msg.slice(0, 12);
		var sequenceNumber = meta.slice(2, 4).readUInt16BE(0);

		var encryptedAudio = msg.slice(12);

		var decipher = crypto.createDecipheriv('aes-128-cbc', rtspServer.audioAesKey, rtspServer.audioAesIv);
		decipher.setAutoPadding(false);

		var audio = decipher.update(encryptedAudio);

		var swapBuf = new Buffer(audio.length);

		for (var i = 0; i < audio.length; i += 2) {
			swapBuf[i] = audio[i + 1];
			swapBuf[i + 1] = audio[i];
		}

		rtspServer.audioProcessor.process(swapBuf, sequenceNumber);

	});
	controlServer.on('message', function(msg) {
		console.log(msg.length + ' BYTES SENT TO CONTROL PORT');
	});
	timingServer.on('message', function(msg) {
		console.log(msg.length + ' BYTES SENT TO TIMING PORT');
	});
}

module.exports = rtpServer;