var ursa = require('ursa');
var fs = require('fs');

var messageBuilder = function(socket) {
	var buffer = '';
	self = this;

	this.addHeader = function(header, data) {
		buffer += header + ": " + data + "\r\n";
	};

	this.setOK = function(cseq) {
		
		buffer += "RTSP/1.0 200 OK\r\n";
		self.addHeader('Server', 'AirTunes/105.1');
		
		if (cseq) {
			self.addHeader('CSeq', cseq);
		}
	};

	this.send = function() {
		console.log('SENDING DATA');
		console.log(buffer);
		console.log('END SEND\n')

		socket.end(buffer + '\r\n');
	};

	var sendError = function(err) {
		socket.end(err + ' ' + errorList[err] + '\r\n');
	};
};

var getAppleResponse = function(challengeBuf, ipAddr, madAddr) {

	var fullChallenge = Buffer.concat([ challengeBuf, ipAddr, macAddr ]);
	
	// im sure there's an easier way to pad this buffer
	var padding = new Array();
	for (var i = fullChallenge.length; i < 32; i++) {
		padding.push(0);
	}
	fullChallenge = Buffer.concat([ fullChallenge, new Buffer(padding) ]);

	var privkey = ursa.createPrivateKey(fs.readFileSync('private.key'));
	var response = privkey.privateEncrypt(challenge, 'base64', 'base64');

	console.log(response);

	return response;
};

module.exports.MessageBuilder = messageBuilder;
module.exports.getAppleResponse = getAppleResponse;