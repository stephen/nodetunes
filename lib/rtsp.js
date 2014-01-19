
var net = require('net');
var ip = require('ip');
var tools = require('./rtsphelper');
var getmac = require('getmac');
var RtpServer = require('./rtp');

var errorList = {
	400: "BAD REQUEST"
};

var server = function() {
	var self = this;
	
	// abitrary ports selected here?
	self.serverPort = 53561;
	self.controlPort = 63379;
	self.timingPort = 50607;

	self.rtp = RtpServer(self);

	// pull method processors
	var methodMapping = require('./rtspmethods')(self);

	// mac address for apple challenge/response
	getmac.getMac(function(err, macAddress){
    	if (err)  throw err;
    	self.macAddress = macAddress;  
	});

	// return true if need to process content, false if done
	var parseHeader = function(socket, msg) {
		var response = new tools.MessageBuilder(socket);

		// debug: dump message
		console.log('INSPECTING HEADER @ ' + socket.id.getTime());
		//console.log('`--: ' + msg.replace(/\r\n/g, '\r\n`--: '));
		//console.log('END HEADER\n\n');

		// parse out the direction and header
		var lines = msg.split('\r\n');
		var methodline = lines[0].split(' ');
		var method = methodline[0].toUpperCase();

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
			return { "method" : method, "response" : response, "headers" : headers, hasContent: true, contentLength: headers['Content-Length'] };
		}

		return { "method" : method, "response" : response, "headers" : headers, hasContent: false, contentLength: 0 };
	};

	var handler = function(socket) {

		var buffer = '';
		var hasContent = false;
		var remaining = -1;
		var terminator = '\r\n\r\n';

		socket.id = new Date();
		console.log('OPENED CONNECTION @ ' + socket.id.getTime());
		socket.on('data', function(c) {

			// buffer and find messages
			buffer += c;
			if (remaining >= 0) {
				remaining -= c.length;
				//console.log('WAITING ON ' + remaining + ' BYTES OF CONTENT REMAINING (ONGOING)');
			}
			
			// check for termination, so we can pass on a header
			if (buffer.indexOf(terminator) >= 0) {

				var msgs = buffer.split(terminator);

				// check the current headers; may or may not specify a payload (via Content-Length header)
				headerData = parseHeader(socket, msgs[0]);
				if (!headerData.hasContent) {
					console.log('CALLING ' + headerData.method + ' WITHOUT CONTENT');
					methodMapping[headerData.method](headerData.response, headerData.headers);
					//console.log('END CALL\n\n');

					buffer = msgs[msgs.length - 1];
				} else {

					// we need to wait for the content to come through
					//console.log('WAITING ON ' + headerData.contentLength + ' BYTES OF CONTENT');
					remaining = headerData.contentLength;
					hasContent = true;

					// check the buffer to make sure stuff isn't overlooked
					buffer = msgs[msgs.length - 1] + '\r\n'; // compensate?
					remaining -= buffer.length;
					//console.log('WAITING ON ' + remaining + ' BYTES OF CONTENT REMAINING (INITIAL)');
					//console.log('`--: ' + buffer.replace(/\r\n/g, '\r\n`--: '));
				}

			}
			if (remaining <= 0 && hasContent) {
				console.log('CALLING ' + headerData.method + ' WITH FOLLOWING CONTENT');
				//console.log('`--: ' + buffer.replace(/\r\n/g, '\r\n`--: '));
				methodMapping[headerData.method](headerData.response, headerData.headers, buffer);
				//console.log('END CALL\n\n');

				buffer = '';
				hasContent = false;
				remaining = -1;
			}
		});

		socket.on('close', function() {
			console.log('END CONNECTION');
		})

	};

	this.handler = handler;
};

module.exports.Server = server;