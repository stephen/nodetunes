
"use strict";

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

  var socketType = this.rtspServer.ipv6 ? 'udp6' : 'upd4';

  this.baseServer = dgram.createSocket(socketType);
  this.controlServer = dgram.createSocket(socketType);
  this.timingServer = dgram.createSocket(socketType);

  this.baseServer.bind(this.rtspServer.ports[0]);
  this.controlServer.bind(this.rtspServer.ports[1]);
  this.timingServer.bind(this.rtspServer.ports[2]);

  this.timeoutCounter = -1;
  this.timeoutChecker = null;

  this.baseServer.on('message', function(msg) {

    var meta = msg.slice(0, 12);
    var sequenceNumber = meta.slice(2, 4).readUInt16BE(0);

    var encryptedAudio = msg.slice(12);

    var decipher = crypto.createDecipheriv('aes-128-cbc', this.rtspServer.audioAesKey, this.rtspServer.audioAesIv);
    decipher.setAutoPadding(false);

    var audio = decipher.update(encryptedAudio);
    this.rtspServer.audioProcessor.process(audio, sequenceNumber);

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
