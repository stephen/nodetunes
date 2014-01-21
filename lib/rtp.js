var dgram = require('dgram');
var tools = require('./rtsphelper');
var crypto = require('crypto');

var rtpServer = function(rtspServer) {
	var self = this;
	var baseServer = dgram.createSocket('udp4');
	var controlServer = dgram.createSocket('udp4');
	var timingServer = dgram.createSocket('udp4');
	var crypto = require('crypto');
var fs = require('fs');
var wstream = fs.createWriteStream('myBinaryFile');
// creates random Buffer of 100 bytes
	self.start = function() {
		baseServer.bind(rtspServer.serverPort);
		controlServer.bind(rtspServer.controlPort);
		timingServer.bind(rtspServer.timingPort);
	};

	baseServer.on('message', function(msg) {
		var meta = msg.slice(0, 12);
		var sequenceNumber = meta.slice(2, 4).readUInt16BE(0);
		//var CC = meta.slice(0, 1).readUInt8(0) & 0x1E;
		//var type = meta.slice(1, 2).readUInt8(0);

		var encryptedAudio = msg.slice(12);

		var decipher = crypto.createDecipheriv('aes-128-cbc', rtspServer.audioAesKey, rtspServer.audioAesIv);
		decipher.setAutoPadding(false);

		var audio = decipher.update(encryptedAudio);

		console.log(audio);

		var swapBuf = new Buffer(audio.length);

		//for (var i = 0; i < audio.length; i += 2) {
		//	swapBuf[i] = audio[audio.length - i - 1];
		//	swapBuf[i + 1] = audio[audio.length - i - 2];
		//}
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