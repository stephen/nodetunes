var ursa = require('ursa');
var fs = require('fs');

var messageBuilder = function(socket) {
	var buffer = '';
	var socket = socket;
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
		console.log('SENDING DATA @ ' + socket.id.getTime());
		console.log('`--: ' + buffer.replace(/\r\n/g, '\r\n`--: '));
		console.log('END SEND\n')
		socket.write(buffer + '\r\n');
	};

	var sendError = function(err) {
		console.log('SENDING ERROR ' + err + ': ' + errorList[err]);
		socket.end(err + ' ' + errorList[err] + '\r\n');
	};
};

var parseSdp = function(msg) {
	var multi = [ 'a', 'p', 'b' ];

	var lines = msg.split('\r\n');
	var output = {};
	for (var i = 0; i < lines.length; i++) {

		var sp = lines[i].split(/=(.+)?/);
		if (sp.length == 3) { // for some reason there's an empty item?
			if (multi.indexOf(sp[0]) != -1) { // some attributes are multiline...
				if (!output[sp[0]])
					output[sp[0]] = new Array();

				output[sp[0]].push(sp[1]);
			} else {
				output[sp[0]] = sp[1];
			}
		}
	}
	return output;
};

var privkey = ursa.createPrivateKey(fs.readFileSync('private.key'));

var generateAppleResponse = function(challengeBuf, ipAddr, macAddr) {
	macAddr = new Buffer('5F513885F785', 'hex'); // inject?
	var fullChallenge = Buffer.concat([ challengeBuf, ipAddr, macAddr ]);
	
	// im sure there's an easier way to pad this buffer
	var padding = new Array();
	for (var i = fullChallenge.length; i < 32; i++) {
		padding.push(0);
	}
	fullChallenge = Buffer.concat([ fullChallenge, new Buffer(padding) ]);

	var response = privkey.privateEncrypt(fullChallenge, 'base64', 'base64');

	return response;
};

module.exports.parseSdp = parseSdp;
module.exports.MessageBuilder = messageBuilder;
module.exports.generateAppleResponse = generateAppleResponse;
module.exports.rsaOperations = privkey;