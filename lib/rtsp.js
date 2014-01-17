var net = require('net');
var tools = require('./rtsphelper');

var errorList = {
	400: "BAD REQUEST"
};

var server = function() {

	var sendError = function(socket, err) {
		socket.end(err + ' ' +errorList[err] + '\r\n');
	};

	var parse = function(socket, msg) {

		var response = new tools.MessageBuilder();

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
				sendError(socket, 400);
				return;
			}

			headers[header[0]] = header[1].replace(/^\s+|\s+$/gm, '');
		}
		if (!headers.hasOwnProperty('CSeq')) {
			sendError(socket, 400);
		};

		// debug; more dumping
		console.log(action);
		console.log(headers);

		// process action
		if (directive == 'OPTIONS') {
			response.setOK(headers['CSeq']);
			response.addHeader('PUBLIC', 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET');
			response.addHeader('AirTunes/105.1\r\n');
			response.send(socket);
		};
	};

	var handler = function(socket) {

		var buffer = '';
		var terminator = '\r\n\r\n';

		console.log('Client connected!');

		socket.on('data', function(c) {
			buffer += c;
			if (buffer.indexOf(terminator) >= 0) {
				var msgs = buffer.split(terminator);
				for (var i = 0; i < msgs.length - 1; i++) {
					parse(socket, msgs[i]);
				};
				buffer = msgs[msgs.length - 1];
			}
		});

	};

	this.handler = handler;
};

module.exports.Server = server;