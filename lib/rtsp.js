var net = require('net');
var tools = require('./rtsphelper');
var ip = require('ip');
var getmac = require('getmac');

var errorList = {
	400: "BAD REQUEST"
};

var server = function() {
	var self = this;

	var actOptions = function(response, headers) {

		response.setOK(headers['CSeq']);
		response.addHeader('Public', 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET');

		if (headers.hasOwnProperty('Apple-Challenge')) {

			// challenge response consists of challenge + ip address + mac address + padding to 32 bytes,
			// encrypted with the ApEx private key (private encryption mode w/ PKCS1 padding)

			var challengeBuf = new Buffer(headers['Apple-Challenge'], 'base64');
			var ipAddr = new Buffer(ip.toBuffer(ip.address()), 'hex');
			var macAddr = new Buffer(self.macAddress.replace(/:/g, ''), 'hex');

			response.addHeader('Apple-Response', tools.getAppleResponse(challengeBuf, ipAddr, macAddr));
		}

		response.send();
	};

	var actAnnounce = function(response, headers) {
		response.send();
	};

	var actSetup = function(response, headers) {
		response.stOK(headers['CSeq']);
		response.addHeader('Transport', 'RTP/AVP/UDP;unicast;mode=record;server_port=53561;control_port=63379;timing_port=50607');
		response.addHeader('Session', '1');
		response.addHeader('Audio-Jack-Status', 'connected');
		response.send();
	};

	var actRecord = function(response, headers) {
		var initSeq = headers['seq'];
		var initRtpTime = headers['rtptime'];
		if (!initSeq || !initRtpTime) {
			response.sendError(400);
		} else {
			response.addHeader('Audio-Latency', '2000');
		}
		response.send();
	};

	var actFlush = function(response, header) {
		response.addHeader('RTP-Info', 'rtptime=1147914212');
		response.send();
	};

	var actTeardown = function(response, headers) {
		response.send();
	};

	var actSetParameter = function(response, headers, content) {
		response.send();
	};

	var actionMapping = {
		"OPTIONS" : actOptions,
		"ANNOUNCE" : actAnnounce,
		"SETUP" : actSetup,
		"RECORD" : actRecord,
		"FLUSH" : actFlush,
		"TEARDOWN" : actTeardown,
		"SET_PARAMETER" : actSetParameter	// metadata, volume control
 	};

	getmac.getMac(function(err, macAddress){
    	if (err)  throw err;
    	self.macAddress = macAddress;  
	});

	// return true if need to process content, false if done
	var parseHeader = function(socket, msg) {

		var response = new tools.MessageBuilder(socket);

		// debug: dump message
		console.log('RECEIVE MESSAGE');
		console.log(msg);
		console.log('END RECEIVE MESSAGE\n\n');

		// parse out the direction and header
		var lines = msg.split('\r\n');
		var action = lines[0].split(' ');
		var directive = action[0].toUpperCase();

		// process headers
		var headers = {};
		for (var i = 1; i < lines.length; i++) {
			var header = lines[i].split(':');
			
			if (header.length != 2) {
				response.sendError(socket, 400);
				return;
			}

			headers[header[0]] = header[1].replace(/^\s+|\s+$/gm, '');
		}

		if (!headers.hasOwnProperty('CSeq')) {
			response.sendError(400);
		};

		// if there's a content-length, likely some sdp data to pull
		if (headers.hasOwnProperty('Content-Length')) {
			return { "directive" : directive, "response" : response, "headers" : headers, hasContent: true, contentLength: headers['Content-Length'] };
		}

		return { "directive" : directive, "response" : response, "headers" : headers, hasContent: false, contentLength: 0 };
	};

	var handler = function(socket) {

		var buffer = '';
		var hasContent = false;
		var remaining = -1;
		var terminator = '\r\n\r\n';

		console.log('opened connection');

		socket.on('data', function(c) {

			// buffer and find messages
			buffer += c;
			if (remaining >= 0) {
				remaining -= c.length;
			}
			
			if (buffer.indexOf(terminator) >= 0) {
				var msgs = buffer.split(terminator);

				headerData = parseHeader(socket, msgs[0]);
				if (!headerData.Content) {
					actionMapping[headerData.directive](headerData.response, headerData.headers);
				} else {
					remaining = headerData.hasContent;
				}

				buffer = msgs[msgs.length - 1];
			}
			if (remaining <= 0 && hasContent) {
				actionMapping[headerData.directive](headerData.response, headerData.headers, buffer);
			}
		});

		socket.on('close', function() {
			console.log('closed connection');
		})

	};

	this.handler = handler;
};

module.exports.Server = server;