"use strict";

var mdns = require('mdns2');
var net = require('net');
var portastic = require('portastic');
var randomMac = require('random-mac');
var RtspServer = require('./rtsp');
var EventEmitter = require('events').EventEmitter;

var NodeTunes = function(options) {
  var self = this;
  var options = options || {};

  if (!options.serverName) {
    options.serverName = 'NodeTunes';
  }

  if (!options.macAddress) {
    options.macAddress = randomMac().toUpperCase().replace(/:/g, '');
  }

  var txtSetup = {
    txtvers: '1',     // txt record version?
    tx: '1',          // ?
    ch: '2',          // # channels
    cn: '0',          // codec; 0=pcm, 1=alac, 2=aac, 3=aac elc; fwiw Sonos supports aac; pcm required for iPad+Spotify; OS X works with pcm
    et: '0,1',        // encryption; 0=none, 1=rsa, 3=fairplay, 4=mfisap, 5=fairplay2.5; need rsa for os x
    md: '0',          // metadata; 0=text, 1=artwork, 2=progress
    pw: (options.password ? 'true' : 'false'),    // password enabled
    sr: '44100',      // sampling rate (e.g. 44.1KHz)
    ss: '16',         // sample size (e.g. 16 bit?)
    tp: 'TCP,UDP',    // transport protocol
    vs: '130.14',     // server version?
    am: options.serverName,   // device model
    ek: '1',          // ? from ApEx; setting to 1 enables iTunes; seems to use ALAC regardless of 'cn' setting
    //sv: 'false',    // ? from ApEx
    //da: 'true',     // ? from ApEx
    //vn: '65537',    // ? from ApEx; maybe rsa key modulus? happens to be the same value
    //fv: '76400.10', // ? from ApEx; maybe AirPort software version (7.6.4)
    //sf: '0x5'       // ? from ApEx
  };

  var netServer = null;
  var rtspServer = new RtspServer(options, self);

  NodeTunes.prototype.start = function() {

    portastic.find({
      min: 5000,
      max: 5050,
      retrieve: 1
    }, function(err, port) {
      if (err) throw err;
      netServer = net.createServer(rtspServer.connectHandler).listen(port, function() {

        // advertise on bonjour
        var ad = mdns.createAdvertisement(mdns.tcp('raop'), port, {
          name: options.macAddress + '@' + options.serverName,
          txtRecord: txtSetup
        });
      });
    });

  };

  NodeTunes.prototype.stop = function() {
    netServer.close();
  };
};

NodeTunes.prototype.__proto__ = EventEmitter.prototype;

module.exports = NodeTunes;
