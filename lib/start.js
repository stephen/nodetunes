var mdns = require('mdns2');
var net = require('net');

var txSetup = {
	txtvers: '1',
	tx: '1',
	ch: '2',
	cn: '2',
	et: '0,1',
	md: '0',
	pw: 'false',
	sr: '44100',
	ss: '16',
	tp: 'UDP',
	vs: '130.14',
	am: 'AirSonos'
};

net.createServer(function(c) {
	console.log('attempted connection!');
}).listen(5000, function() {
	var ad = mdns.createAdvertisement(mdns.tcp('raop'), 5000, {
		name: "5F513885F785@AirSonos",
		txtRecord: txSetup
	});
	console.log('advertising airsonos on bonjour');
});
