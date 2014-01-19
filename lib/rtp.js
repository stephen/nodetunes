var dgram = require('dgram');

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
		//console.log(msg.length + ' BYTES SENT TO SERVER PORT');
	});
	controlServer.on('message', function(msg) {
		console.log(msg.length + ' BYTES SENT TO CONTROL PORT');
	});
	timingServer.on('message', function(msg) {
		console.log(msg.length + ' BYTES SENT TO TIMING PORT');
	});

	return self;
}

module.exports = rtpServer;