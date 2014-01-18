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
		response.addHeader('PUBLIC', 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET');
		response.addHeader('AirTunes/105.1\r\n');
		if (headers.hasOwnProperty('Apple-Challenge')) {

			// super confused here.
			// verified this against the python script at https://github.com/E2OpenPlugins/e2openplugin-OpenAirPlay
			// 
			// other notes:
			// https://github.com/abrasive/shairport/blob/e074967b3e0d166df1183546c3724fa3eba3ec34/rtsp.c
			// https://github.com/abrasive/shairport/blob/e074967b3e0d166df1183546c3724fa3eba3ec34/common.c
			// https://github.com/albertz/shairport/blob/master/shairport.c
			//

			var challengeBuf = new Buffer(headers['Apple-Challenge'], 'base64');
			var ipAddr = new Buffer(ip.toBuffer(ip.address()), 'hex');
			var macAddr = new Buffer(self.macAddress.replace(/:/g, ''), 'hex');
			//console.log(challengeBuf);
			//console.log(ipAddr);
			//console.log(macAddr);
			response.addHeader('Apple-Response', tools.getAppleResponse(Buffer.concat([ challengeBuf, ipAddr, macAddr ])));
		}
		response.send();
	};

	var actAnnounce = function(response, headers) {

	};

	var actSetup = function(response, headers) {

	};

	var actRecord = function(response, headers) {

	};

	var actFlush = function(response, header) {

	};

	var actTeardown = function(response, headers) {

	};

	var actionMapping = {
		"OPTIONS" : actOptions,
		"ANNOUNCE" : actAnnounce,
		"SETUP" : actSetup,
		"RECORD" : actRecord,
		"FLUSH" : actFlush,
		"TEARDOWN" : actTeardown
	};


	getmac.getMac(function(err, macAddress){
    	if (err)  throw err;
    	self.macAddress = macAddress;  
	});

	// return true if need to process payload, false if done
	var parseHeader = function(socket, msg) {

		var response = new tools.MessageBuilder(socket);

		// debug: dump message
		console.log('BEGIN');
		console.log(msg);
		console.log('END MESSAGE\n\n');

		// parse out the direction and header
		var lines = msg.split('\r\n');
		var action = lines[0].split(' ');
		var directive = action[0].toUpperCase();

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
		if (headers.hasOwnProperty('Content-Length')) {
			return { "directive" : directive, "response" : response, "headers" : headers, hasContent: true, contentLength: headers['Content-Length'] };
		}

		return { "directive" : directive, "response" : response, "headers" : headers, hasContent: false, contentLength: 0 };
	};

	var handler = function(socket) {

		var buffer = '';
		var hasPayload = false;
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
					remaining = headerData.hasPayload;
				}

				buffer = msgs[msgs.length - 1];
			}
			if (remaining <= 0 && hasPayload) {
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