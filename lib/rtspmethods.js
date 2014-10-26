"use strict";

var tools = require('./helper');
var ip = require('ip');
var dgram = require('dgram');
var randomstring = require('randomstring');
var crypto = require('crypto');
var stream = require('stream');
var BufferStream = require('bufferstream');

module.exports = function(rtspServer) {

  var nonce = '';

  var options = function(req, res) {

    res.set('Public', 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET');

    if (req.getHeader('Apple-Challenge')) {

      // challenge response consists of challenge + ip address + mac address + padding to 32 bytes,
      // encrypted with the ApEx private key (private encryption mode w/ PKCS1 padding)

      var challengeBuf = new Buffer(req.getHeader('Apple-Challenge'), 'base64');
      var ipAddr = new Buffer(ip.toBuffer(ip.address()), 'hex');
      var macAddr = new Buffer(rtspServer.macAddress.replace(/:/g, ''), 'hex');
      res.set('Apple-Response', tools.generateAppleResponse(challengeBuf, ipAddr, macAddr));
    }

    res.send();
  };

  var announce = function(req, res) {
    if (rtspServer.clientConnected) {
      res.status(453).send();
    } else if (rtspServer.options.password && !req.getHeader('Authorization')) {

      var md5sum = crypto.createHash('md5');
      md5sum.update = randomstring.generate();
      res.status(401);
      nonce = md5sum.digest('hex').toString('hex');

      res.set('WWW-Authenticate', 'Digest realm="roap", nonce="' + nonce + '"');
      res.send();

    } else if (rtspServer.options.password && req.getHeader('Authorization')) {

      var auth = req.getHeader('Authorization');

      var params = auth.split(/, /g);
      var map = {};
      params.forEach(function(param) {
        var pair = param.replace(/["]/g, '').split('=');
        map[pair[0]] = pair[1];
      });

      var expectedResponse = tools.generateRfc2617Response('iTunes', 'roap', rtspServer.options.password, nonce, map.uri, 'ANNOUNCE');
      var receivedResponse = map.response;

      if (expectedResponse === receivedResponse) {
        announceParse(req, res);
      } else {
        res.send(401);
      }

    } else {
      announceParse(req, res);
    }
  };

  var announceParse = function(req, res) {

    var sdp = tools.parseSdp(req.content.toString());

    for (var i = 0; i < sdp.a.length; i++) {
      var sp = sdp.a[i].split(':');
      if (sp.length == 2) {
        if (sp[0] == 'rsaaeskey') {
          rtspServer.audioAesKey = tools.rsaOperations.decrypt(new Buffer(sp[1], 'base64'));
        } else if (sp[0] == 'aesiv') {
          rtspServer.audioAesIv = new Buffer(sp[1], 'base64');
        } else if (sp[0] == 'rtpmap') {
          rtspServer.audioCodec = sp[1];
        } else if (sp[0] == 'fmtp') {
          rtspServer.audioOptions = sp[1].split(' ');
        }
      }
    }

    if (sdp.i) {
      rtspServer.metadata.clientName = sdp.i;
      rtspServer.external.emit('clientNameChange', sdp.i);
    }
    
    rtspServer.clientName = sdp.i;

    rtspServer.clientConnected = res.socket;
    rtspServer.outputStream = new BufferStream([{size:'flexible'}]);
    rtspServer.external.emit('clientConnected', rtspServer.outputStream);

    res.send();
  };

  var setup = function(req, res) {
    rtspServer.ports = [];
    
    var getRandomPort = function() {
      var min = 5000;
      var max = 9999;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    rtspServer.ports = [ getRandomPort(), getRandomPort(), getRandomPort() ];

    if (rtspServer.ports.length >= 3) {

      rtspServer.rtp.start();

      res.set('Transport', 'RTP/AVP/UDP;unicast;mode=record;server_port=' + rtspServer.ports[0] + ';control_port=' + rtspServer.ports[1] + ';timing_port=' + rtspServer.ports[2]);
      res.set('Session', '1');
      res.set('Audio-Jack-Status', 'connected');
      res.send();

    }
  };

  var record = function(req, res) {
    if (!req.getHeader('RTP-Into')) {
      // it seems like iOS airplay does something else
    } else {
      var rtpInfo = req.getHeader('RTP-Info').split(';');
      var initSeq = rtpInfo[0].split('=')[1];
      var initRtpTime = rtpInfo[1].split('=')[1];
      if (!initSeq || !initRtpTime) {
        res.send(400);
      } else {
        res.set('Audio-Latency', '100');
      }
    }
    res.send();
  };

  var flush = function(req, res) {
    res.set('RTP-Info', 'rtptime=1147914212');
    res.send();
  };

  var teardown = function(req, res) {
    rtspServer.rtp.stop();
    res.send();
  };

  var setParameter = function(req, res) {
    if (req.getHeader('Content-Type') == 'application/x-dmap-tagged') {
      
      // metadata dmap/daap format
      var dmapData = tools.parseDmap(req.content);
      rtspServer.metadata = dmapData;
      rtspServer.external.emit('metadataChange', rtspServer.metadata);

    } else if (req.getHeader('Content-Type') == 'image/jpeg') {
      
      rtspServer.metadata.artwork = req.content;
      rtspServer.external.emit('artworkChange', req.content);

    } else if (req.getHeader('Content-Type') == 'text/parameters') {

      var data = req.content.toString().split(': ');
      rtspServer.metadata = rtspServer.metadata || {};

      if (data[0] == 'volume') {
        rtspServer.metadata.volume = parseFloat(data[1]);
        rtspServer.external.emit('volumeChange', rtspServer.metadata.volume);

      } else if (data[0] == 'progress') {

        rtspServer.metadata.progress = data[1];
        rtspServer.external.emit('progressChange', rtspServer.metadata.progress);
        
      }

    } else {

    }
    res.send();
  };

  var getParameter = function(req, res) {
    res.send();
  };

  return {
    "OPTIONS" : options,
    "ANNOUNCE" : announce,
    "SETUP" : setup,
    "RECORD" : record,
    "FLUSH" : flush,
    "TEARDOWN" : teardown,
    "SET_PARAMETER" : setParameter, // metadata, volume control
    "GET_PARAMETER" : getParameter // asked for by iOS?
   };
};
