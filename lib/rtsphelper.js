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
		if (cseq) {
			self.addHeader('CSeq', cseq);
		}
	};

	this.send = function() {
		socket.end(buffer);
	};

	var sendError = function(err) {
		socket.end(err + ' ' + errorList[err] + '\r\n');
	};
};

var getAppleResponse = function(challenge) {

	var privkey = ursa.createPrivateKey(fs.readFileSync('private.key'));
	var response = privkey.privateEncrypt(challenge, 'base64', 'base64');

	console.log(response);

	return response;
};

module.exports.MessageBuilder = messageBuilder;
module.exports.getAppleResponse = getAppleResponse;