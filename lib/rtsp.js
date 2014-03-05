"use strict";

var net = require('net');
var tools = require('./rtsphelper');
var RtpServer = require('./rtp');
var AudioProcessor = require('./audioprocessor');

var server = function(options, external) {
	var self = this;

	self.external = external;
	self.options = options;

	self.ports = [];

	self.rtp = new RtpServer(self);
	self.audioProcessor = new AudioProcessor(self);
	self.macAddress = '5F513885F785';
	self.metadata = {};
	// pull method processors
	var methodMapping = require('./rtspmethods')(self);

	// return true if need to process content, false if done
	var parseHeader = function(socket, msg) {
		var response = new tools.MessageBuilder(socket);

		// debug: dump message
		//console.log('INSPECTING HEADER @ ' + socket.id.getTime());
		//console.log('`--: ' + msg.replace(/\r\n/g, '\r\n`--: '));
		//console.log('END HEADER\n\n');

		// parse out the direction and header
		var lines = msg.split('\r\n');
		var methodline = lines[0].split(' ');
		var method = methodline[0].toUpperCase();

		// process headers
		var headers = {};
		for (var i = 1; i < lines.length; i++) {
			var header = [ lines[i].substr(0, lines[i].indexOf(':')), lines[i].substr(lines[i].indexOf(':')+1) ];

			if (header.length != 2) {
				response.sendError(400);
				return { "success" : false };
			}

			headers[header[0]] = header[1].replace(/^\s+|\s+$/gm, '');
		}

		if (!headers.hasOwnProperty('CSeq')) {
			response.sendError(400);
		};

		// if there's a content-length, likely some sdp data to pull
		if (headers.hasOwnProperty('Content-Length')) {
			return { "success" : true, "method" : method, "response" : response, "headers" : headers, hasContent: true, contentLength: headers['Content-Length'] };
		}

		return { "success" : true, "method" : method, "response" : response, "headers" : headers, hasContent: false, contentLength: 0 };
	};

	var handler = function(socket) {

		var buffer = '';
		var binBuffer = null; // used only for binary content (e.g. dmap)
		var hasContent = false;
		var remaining = -1;
		var terminator = '\r\n\r\n';
		var headerData = null;

		socket.id = new Date();
		//console.log('OPENED CONNECTION @ ' + socket.id.getTime());
		socket.on('data', function(c) {

			// buffer and find messages
			buffer += c;
			if (remaining >= 0) {
				remaining -= c.length;
				Buffer.concat([ binBuffer, c ]);
				//console.log('WAITING ON ' + remaining + ' BYTES OF CONTENT REMAINING (ONGOING)');
			}

			// check for termination, so we can pass on a header
			if (buffer.indexOf(terminator) >= 0) {

				var msgs = buffer.split(terminator);

				// check the current headers; may or may not specify a payload (via Content-Length header)
				headerData = parseHeader(socket, msgs[0]);
				if (!headerData.hasContent) {
					//console.log('CALLING ' + headerData.method + ' WITHOUT CONTENT');
					methodMapping[headerData.method](headerData.response, headerData.headers);
					//console.log('END CALL\n\n');

					buffer = msgs[msgs.length - 1];
				} else {

					// we need to wait for the content to come through
					//console.log('WAITING ON ' + headerData.contentLength + ' BYTES OF CONTENT');
					remaining = headerData.contentLength;
					hasContent = true;

					// check the buffer to make sure stuff isn't overlooked
					binBuffer = c.slice(buffer.indexOf(terminator) + 4);
					buffer = msgs[msgs.length - 1] + '\r\n'; // compensate?
					remaining -= buffer.length;
					//console.log('WAITING ON ' + remaining + ' BYTES OF CONTENT REMAINING (INITIAL)');
					//console.log('`--: ' + buffer.replace(/\r\n/g, '\r\n`--: '));
				}

			}
			if (remaining <= 0 && hasContent && headerData) {
				//console.log('CALLING ' + headerData.method + ' WITH FOLLOWING CONTENT');
				//console.log('`--: ' + buffer.replace(/\r\n/g, '\r\n`--: '));
				methodMapping[headerData.method](headerData.response, headerData.headers, binBuffer);
				//console.log('END CALL\n\n');
				binBuffer = null;
				buffer = '';
				hasContent = false;
				remaining = -1;
			}
		});

	};

	this.handler = handler;
};

module.exports = server;
