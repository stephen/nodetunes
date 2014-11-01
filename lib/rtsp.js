"use strict";

var net = require('net');
var ServerParser = require('httplike');
var tools = require('./helper');
var RtpServer = require('./rtp');
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

  this.clientConnected = null;

  this.methodMapping = require('./rtspmethods')(this);

}

RtspServer.prototype.connectHandler = function(socket) {

  socket.id = new Date().getTime();

  var parser = new ServerParser(socket, {
    protocol: 'RTSP/1.0',
    statusMessages: {
      453: "NOT ENOUGH BANDWIDTH"
    }
  });

  parser.on('message', function(req, res) {

    res.set('CSeq', req.getHeader('CSeq'));
    res.set('Server', 'AirTunes/105.1');

    var method = this.methodMapping[req.method];

    if (method) {
      method(req, res);
    } else {
      console.warn('Received unknown RTSP method:', req.method);
      res.send(400);
      socket.end();
    }

  }.bind(this));

  socket.on('close', this.disconnectHandler.bind({ self: this, socket: socket }));
};

RtspServer.prototype.disconnectHandler = function() {
  // keep in mind 'this' is bound to an object that looks like { self: this, socket: socket }
  // (see above)

  if (this.socket === this.self.clientConnected) {

    this.self.clientConnected = null;
    this.self.outputStream = null;
    this.self.rtp.stop();
    this.self.external.emit('clientDisconnected');
  }

};

module.exports = RtspServer;
