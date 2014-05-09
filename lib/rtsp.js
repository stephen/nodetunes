"use strict";

var net = require('net');
var Parser = require('httplike');
var tools = require('./helper');
var RtpServer = require('./rtp');
var Stream = require('stream');
var AudioProcessor = require('./audioprocessor');

function RtspServer(options, external) {
  var self = this;

  this.external = external;
  this.options = options;

  this.ports = [];

  this.rtp = new RtpServer(self);
  this.audioProcessor = new AudioProcessor(self);
  this.macAddress = options.macAddress;
  this.metadata = {};
  this.outputStream = null;

  this.clientConnected = false;

  // pull method processors
  this.methodMapping = require('./rtspmethods')(this);

}

RtspServer.prototype.connectHandler = function(socket) {

  this.outputStream = new Stream.PassThrough();

  socket.id = new Date();
  this.external.emit('clientConnected', this.outputStream);
  
  var parser = new Parser(socket, {
    protocol: 'RTSP/1.0',
    statusMessages: {
      453: "NOT ENOUGH BANDWIDTH"
    }
  });

  parser.on('message', function(req, res) {
    var response = new tools.MessageBuilder(socket);
    this.methodMapping[req.method](req, res);
  }.bind(this));

  socket.on('close', this.disconnectHandler.bind(this));
};

RtspServer.prototype.disconnectHandler = function() {

  this.clientConnected = false;
  this.outputStream = null;
  this.rtp.stop();
  this.external.emit('clientDisconnected');

};

module.exports = RtspServer;
