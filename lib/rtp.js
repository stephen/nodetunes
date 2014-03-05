"use strict";

var dgram = require('dgram');
var tools = require('./rtsphelper');
var crypto = require('crypto');

var rtpServer = function(rtspServer) {
	var self = this;
	var crypto = require('crypto');

	self.start = function() {
		self.baseServer = dgram.createSocket('udp4');
		self.controlServer = dgram.createSocket('udp4');
		self.timingServer = dgram.createSocket('udp4');

		self.baseServer.bind(rtspServer.ports[0]);
		self.controlServer.bind(rtspServer.ports[1]);
		self.timingServer.bind(rtspServer.ports[2]);

		self.baseServer.on('message', function(msg) {
			var meta = msg.slice(0, 12);
			var sequenceNumber = meta.slice(2, 4).readUInt16BE(0);

			var encryptedAudio = msg.slice(12);

			var decipher = crypto.createDecipheriv('aes-128-cbc', rtspServer.audioAesKey, rtspServer.audioAesIv);
			decipher.setAutoPadding(false);

			var audio = decipher.update(encryptedAudio);

			rtspServer.audioProcessor.process(audio, sequenceNumber);

		});

		self.controlServer.on('message', function(msg) {
			var timestamp = msg.readUInt32BE(4);
		});

		self.timingServer.on('message', function(msg) {
			//console.log(msg.length + ' BYTES SENT TO TIMING PORT');
		});
	};

	self.stop = function() {
		self.baseServer.close();
		self.controlServer.close();
		self.timingServer.close();
	}
}

module.exports = rtpServer;
