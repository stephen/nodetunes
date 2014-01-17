var mdns = require('mdns2');
var net = require('net');
var rtsp = require('./rtsp');

var txtSetup = {
	txtvers: '1', 		// txt record version?
	tx: '1',			// ?
	ch: '2',			// # channels
	cn: '0,2',			// codec; 0=pcm, 1=alac, 2=aac, 3=aac elc
	et: '0,1',			// encryption; 0=none, 1=rsa, 3=fairplay, 4=mfisap, 5=fairplay2.5; need rsa for os x
	md: '0',			// metadata; 0=text, 1=artwork, 2=progress
	pw: 'false',		// password enabled
	sr: '44100',		// sampling rate (e.g. 44.1KHz)
	ss: '16',			// sample size (e.g. 16 bit?)
	tp: 'TCP,UDP',		// transport protocol
	vs: '130.14',		// server version?
	am: 'AirSonos',		// device model

	//ek: '1',			// ? from ApEx; setting to 1 enables iTunes?
	//sv: 'false',		// ? from ApEx
	//da: 'true', 		// ? from ApEx
	//vn: '65537',		// ? from ApEx; maybe rsa key modulus? happens to be the same value
	//fv: '76400.10',	// ? from ApEx; maybe AirPort software version (7.6.4)
	//sf: '0x5'			// ? from ApEx
};

(function() {
	var server = new rtsp.Server();

	net.createServer(server.handler).listen(5000, function() {
		var ad = mdns.createAdvertisement(mdns.tcp('raop'), 5000, {
			name: "5F513885F785@AirSonos",
			txtRecord: txtSetup
		});
		console.log('advertising airsonos on bonjour');
	});
})();