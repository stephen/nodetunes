"use strict";

var net = require('net');
var Parser = require('httplike');
var tools = require('./rtspHelper');
var RtpServer = require('./rtp');
var AudioProcessor = require('./audioProcessor');

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

	var handler = function(socket) {

		socket.id = new Date();
		self.external.emit('clientConnected');

		var parser = new Parser(socket);
		parser.on('message', function(m) {
			var response = new tools.MessageBuilder(socket);
			methodMapping[m.method](response, m.headers, m.content);
		});

	};

	self.handler = handler;
};

module.exports = server;
