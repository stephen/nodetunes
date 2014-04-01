"use strict";

var net = require('net');
var Parser = require('httplike');
var tools = require('./rtspHelper');
var RtpServer = require('./rtp');
var Stream = require('stream');
var AudioProcessor = require('./audioProcessor');

var Server = function(options, external) {
  var self = this;

  self.external = external;
  self.options = options;

  self.ports = [];

  self.rtp = new RtpServer(self);
  self.audioProcessor = new AudioProcessor(self);
  self.macAddress = options.macAddress;
  self.metadata = {};
  self.outputStream = null;

  self.clientConnected = false;

  // pull method processors
  var methodMapping = require('./rtspMethods')(self);

  Server.prototype.connectHandler = function(socket) {

    self.outputStream = Stream.PassThrough();

    socket.id = new Date();
    self.external.emit('clientConnected', self.outputStream);

    var parser = new Parser(socket);
    parser.on('message', function(m) {
      var response = new tools.MessageBuilder(socket);
      methodMapping[m.method](response, m.headers, m.content);
    });

    socket.on('close', self.disconnectHandler);
    
  };

  Server.prototype.disconnectHandler = function() {

    self.clientConnected = false;
    self.outputStream.close();
    self.outputStream = null;
    self.external.emit('clientDisconnected');

  };

};

module.exports = Server;
