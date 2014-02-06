var mdns = require('mdns2');
var net = require('net');
var RtspServer = require('./rtsp');
var EventEmitter = require('events').EventEmitter;

var AirTunesServer = function(outStream, options) { 
	var self = this;
	var options = options || {};

	options.outStream = outStream;

	if (!options.serverName) {
		options.serverName = 'NodeTunes';
	}

	if (!options.macAddress) {
		options.macAddress = '5F513885F785';
	}

	var txtSetup = {
		txtvers: '1', 		// txt record version?
		tx: '1',			// ?
		ch: '2',			// # channels
		cn: '0',			// codec; 0=pcm, 1=alac, 2=aac, 3=aac elc; fwiw Sonos supports aac; pcm required for iPad+Spotify; OS X works with pcm
		et: '0,1',			// encryption; 0=none, 1=rsa, 3=fairplay, 4=mfisap, 5=fairplay2.5; need rsa for os x
		md: '0',			// metadata; 0=text, 1=artwork, 2=progress
		pw: 'false',		// password enabled
		sr: '44100',		// sampling rate (e.g. 44.1KHz)
		ss: '16',			// sample size (e.g. 16 bit?)
		tp: 'TCP,UDP',		// transport protocol
		vs: '130.14',		// server version?
		am: options.serverName,		// device model
		ek: '1',			// ? from ApEx; setting to 1 enables iTunes; seems to use ALAC regardless of 'cn' setting
		//sv: 'false',		// ? from ApEx
		//da: 'true', 		// ? from ApEx
		//vn: '65537',		// ? from ApEx; maybe rsa key modulus? happens to be the same value
		//fv: '76400.10',	// ? from ApEx; maybe AirPort software version (7.6.4)
		//sf: '0x5'			// ? from ApEx
	};

	var netServer = null;
	var rtspServer = new RtspServer(options, self);

	self.start = function() {

		netServer = net.createServer(rtspServer.handler).listen(5000, function() {
			var ad = mdns.createAdvertisement(mdns.tcp('raop'), 5000, {
				name: options.macAddress + '@' + options.serverName,
				txtRecord: txtSetup
			});
		});

	};

	self.stop = function() {
		netServer.close();
	};
};

AirTunesServer.prototype.__proto__ = EventEmitter.prototype;

module.exports = AirTunesServer;