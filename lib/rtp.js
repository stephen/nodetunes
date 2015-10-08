
'use strict';

var dgram = require('dgram');
var tools = require('./helper');
var crypto = require('crypto');
var debug = require('debug')('nodetunes:rtp');

function RtpServer(rtspServer) {
  this.rtspServer = rtspServer;
  debug = require('debug')('nodetunes:rtp'); // HACK: need to reload debug here (https://github.com/visionmedia/debug/issues/150)
}

RtpServer.prototype.start = function() {
  debug('starting rtp servers');

  var socketType = this.rtspServer.ipv6 ? 'udp6' : 'udp4';

  this.baseServer = dgram.createSocket(socketType);
  this.controlServer = dgram.createSocket(socketType);
  this.timingServer = dgram.createSocket(socketType);

  this.baseServer.bind(this.rtspServer.ports[0]);
  this.controlServer.bind(this.rtspServer.ports[1]);
  this.timingServer.bind(this.rtspServer.ports[2]);

  this.timeoutCounter = -1;
  this.timeoutChecker = null;

  this.baseServer.on('message', function(msg) {
    var seq = msg.readUInt16BE(2);
    var audio = tools.decryptAudioData(msg, this.rtspServer.audioAesKey, this.rtspServer.audioAesIv);
    this.rtspServer.outputStream.add(audio, seq);

  }.bind(this));

  this.controlServer.on('message', function(msg) {

    // timeout logic for socket disconnects
    if (this.timeoutCounter === -1 && this.rtspServer.controlTimeout) {

      this.timeoutChecker = setInterval(function() {
        this.timeoutCounter++;

        if (this.timeoutCounter >= this.rtspServer.controlTimeout) {
          this.rtspServer.timeoutHandler();
        }

      }.bind(this), 1000);

    }

    this.timeoutCounter = 0;

  }.bind(this));

  this.timingServer.on('message', function(msg) {

  }.bind(this));

};

RtpServer.prototype.stop = function() {
  if (this.baseServer) {

    debug('stopping rtp servers');

    try {
      if (this.timeoutChecker) clearInterval(this.timeoutChecker);
      this.baseServer.close();
      this.controlServer.close();
      this.timingServer.close();
    } catch (err) {

    }
  }
};

module.exports = RtpServer;
