var ursa = require('ursa');
var fs = require('fs');

var messageBuilder = function(initialState) {
	var buffer = '';
	var self = this;

	this.addHeader = function(header, data) {
		buffer += header + ": " + data + "\r\n";
	};

	this.setOK = function(cseq) {
		buffer += "RTSP/1.0 200 OK\r\n";
		if (cseq) {
			self.addHeader('CSeq', cseq);
		}
	};

	this.send = function(socket) {
		socket.end(buffer);
	};
};

var getAppleResponse = function(challenge) {

	//var buffer = new Buffer(headers['Apple-Challenge'], 'base64');
	var privkey = ursa.createPrivateKey(fs.readFileSync('private.key'));
	var response = privkey.privateEncrypt(challenge, 'hex', 'base64');

	return response;
};

module.exports.MessageBuilder = messageBuilder;
module.exports.getAppleResponse = getAppleResponse;