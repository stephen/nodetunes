"use strict";

var ursa = require('ursa');
var fs = require('fs');
var crypto = require('crypto');

var statusMessages = {
	200: "OK",
	401: "Unauthorized"
};

var MessageBuilder = function(socket) {

	var buffer = '';
	var socket = socket;
	var self = this;

	MessageBuilder.prototype.addHeader = function(header, data) {
		buffer += header + ": " + data + "\r\n";
	};

	MessageBuilder.prototype.setStatus = function(statusCode, cseq) {
		buffer += "RTSP/1.0 " + statusCode + " " + statusMessages[statusCode] + '\r\n';
		self.addHeader('Server', 'AirTunes/105.1');
		self.addHeader('CSeq', cseq);
	}

	MessageBuilder.prototype.setOK = function(cseq) {
		self.setStatus(200, cseq);
	};

	MessageBuilder.prototype.send = function() {
		//console.log('SENDING DATA @ ' + socket.id.getTime());
		//console.log('`--: ' + buffer.replace(/\r\n/g, '\r\n`--: '));
		//console.log('END SEND\n')
		socket.write(buffer + '\r\n');
	};

	MessageBuilder.prototype.sendError = function(err) {
		//console.log('SENDING ERROR ' + err + ': ' + errorList[err]);
		socket.end("RTSP/1.0 " + err + ' ' + statusMessages[err] + '\r\n');
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

var dmapTypes = {
	mper: 8,
	asal: 'str',
	asar: 'str',
	ascp: 'str',
	asgn: 'str',
	minm: 'str',
	astn: 2,
	asdk: 1,
	caps: 1,
	astm: 4
};

var parseDmap = function(buffer) {
	var output = {};

	for (var i = 8; i < buffer.length;) {
		var itemType = buffer.slice(i, i + 4);
		var itemLength = buffer.slice(i + 4, i + 8).readUInt32BE(0);
		if (itemLength != 0) {
			var data = buffer.slice(i + 8, i + 8 + itemLength);
			if (dmapTypes[itemType] == 'str') {
				output[itemType.toString()] = data.toString();
			} else if (dmapTypes[itemType] == 1) {
				output[itemType.toString()] = data.readUInt8(0);
			} else if (dmapTypes[itemType] == 2) {
				output[itemType.toString()] = data.readUInt16BE(0);
			} else if (dmapTypes[itemType] == 4) {
				output[itemType.toString()] = data.readUInt32BE(0);
			} else if (dmapTypes[itemType] == 8) {
				output[itemType.toString()] = (data.readUInt32BE(0) << 8) + data.readUInt32BE(4);
			}
		}
		i += 8 + itemLength;
	}

	return output;
}

var privkey = ursa.createPrivateKey(fs.readFileSync(__dirname + '/private.key'));

var generateAppleResponse = function(challengeBuf, ipAddr, macAddr) {
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

var generateRfc2617Response = function(username, realm, password, nonce, uri, method) {

	var ha1 = crypto.createHash('md5').update(username + ':' + realm + ':' + password).digest().toString('hex');
	var ha2 = crypto.createHash('md5').update(method + ':' + uri).digest().toString('hex');
	var response = crypto.createHash('md5').update(ha1 + ':' + nonce + ':' + ha2).digest().toString('hex');

	return response;
}

module.exports.parseSdp = parseSdp;
module.exports.MessageBuilder = MessageBuilder;
module.exports.parseDmap = parseDmap;
module.exports.generateAppleResponse = generateAppleResponse;
module.exports.generateRfc2617Response = generateRfc2617Response;
module.exports.rsaOperations = privkey;
