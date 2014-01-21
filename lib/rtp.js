var dgram = require('dgram');
var tools = require('./rtsphelper');
var crypto = require('crypto');

var rtpServer = function(rtspServer) {
	var self = this;
	var baseServer = dgram.createSocket('udp4');
	var controlServer = dgram.createSocket('udp4');
	var timingServer = dgram.createSocket('udp4');

	self.start = function() {
		baseServer.bind(rtspServer.serverPort);
		controlServer.bind(rtspServer.controlPort);
		timingServer.bind(rtspServer.timingPort);
	};

	baseServer.on('message', function(msg) {
		var meta = msg.slice(0, 12);
		var sequenceNumber = meta.slice(2, 4).readUInt16BE(0);
		console.log(sequenceNumber + "; ");
		console.log(meta.slice(2, 4));

		var encryptedAudio = msg.slice(12);

		var decipher = crypto.createDecipheriv('aes-128-cbc', rtspServer.audioAesKey, rtspServer.audioAesIv);
		decipher.setAutoPadding(false);

		var audio = decipher.update(encryptedAudio);

		console.log(audio);

		rtspServer.audioProcessor.process(audio);
	});
	controlServer.on('message', function(msg) {
		console.log(msg.length + ' BYTES SENT TO CONTROL PORT');
	});
	timingServer.on('message', function(msg) {
		console.log(msg.length + ' BYTES SENT TO TIMING PORT');
	});
}

module.exports = rtpServer;