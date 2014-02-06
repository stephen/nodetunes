
var tools = require('./rtsphelper');
var ip = require('ip');
var portastic = require('portastic');

module.exports = function(rtspServer) {

	var rtspServer = rtspServer;

	var options = function(response, headers) {

		response.setOK(headers['CSeq']);
		response.addHeader('Public', 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET');

		if (headers.hasOwnProperty('Apple-Challenge')) {

			// challenge response consists of challenge + ip address + mac address + padding to 32 bytes,
			// encrypted with the ApEx private key (private encryption mode w/ PKCS1 padding)

			var challengeBuf = new Buffer(headers['Apple-Challenge'], 'base64');
			var ipAddr = new Buffer(ip.toBuffer(ip.address()), 'hex');
			var macAddr = new Buffer(rtspServer.macAddress.replace(/:/g, ''), 'hex');
			response.addHeader('Apple-Response', tools.generateAppleResponse(challengeBuf, ipAddr, macAddr));
		}

		response.send();
	};

	var announce = function(response, headers, content) {
		var sdp = tools.parseSdp(content.toString());
		for (var i = 0; i < sdp.a.length; i++) {
			var sp = sdp.a[i].split(':');
			if (sp.length == 2) {
				if (sp[0] == 'rsaaeskey') {
					rtspServer.audioAesKey = tools.rsaOperations.decrypt(new Buffer(sp[1], 'base64'));
				} else if (sp[0] == 'aesiv') {
					rtspServer.audioAesIv = new Buffer(sp[1], 'base64');
				} else if (sp[0] == 'rtpmap') {
					rtspServer.audioCodec = sp[1];
				}
			}
		}
		rtspServer.clientName = sdp.i;

		response.setOK(headers['CSeq']);
		response.send();
	};

	var setup = function(response, headers) {
		rtspServer.ports = [];

		portastic.find({
		    min : 50000,
		    max : 50020,
		    retrieve: 3
		}, function(err, port){
		    if (err) throw err;

		    rtspServer.ports = port;

		    if (rtspServer.ports.length >= 3) {

				rtspServer.rtp.start();

				response.setOK(headers['CSeq']);
				response.addHeader('Transport', 'RTP/AVP/UDP;unicast;mode=record;server_port=' + rtspServer.ports[0] + ';control_port=' + rtspServer.ports[1] + ';timing_port=' + rtspServer.ports[2]);
				response.addHeader('Session', '1');
				response.addHeader('Audio-Jack-Status', 'connected');
				response.send();

		    }
		});
	};

	var record = function(response, headers) {
		response.setOK(headers['CSeq']);
		if (!headers['RTP-Info']) {
			// it seems like iOS airplay does something else
		} else {
			var rtpInfo = headers['RTP-Info'].split(';');
			var initSeq = rtpInfo[0].split('=')[1];
			var initRtpTime = rtpInfo[1].split('=')[1];
			if (!initSeq || !initRtpTime) {
				response.sendError(400);
			} else {
				response.addHeader('Audio-Latency', '1000');
			}
		}
		response.send();
	};

	var flush = function(response, headers) {
		response.setOK(headers['CSeq']);
		response.addHeader('RTP-Info', 'rtptime=1147914212');
		response.send();
	};

	var teardown = function(response, headers) {
		rtspServer.rtp.stop();
		response.setOK(headers['CSeq']);
		response.send();
	};

	var setParameter = function(response, headers, content) {
		if (headers['Content-Type'] == 'application/x-dmap-tagged') {
			// metadata dmap/daap format

			var dmapData = tools.parseDmap(new Buffer(content));
			rtspServer.metadata = dmapData;

		} else if (headers['Content-Type'] == 'image/jpeg') {
			rtspServer.metadata.artwork = new Buffer(content);
		} else if (headers['Content-Type'] == 'text/parameters') {
			
		} else {
			
		}
		response.setOK(headers['CSeq']);
		response.send();
	};

	var getParameter = function(response, headers, content) {
		response.setOK(headers['CSeq']);
		response.send();
	}


	return {
		"OPTIONS" : options,
		"ANNOUNCE" : announce,
		"SETUP" : setup,
		"RECORD" : record,
		"FLUSH" : flush,
		"TEARDOWN" : teardown,
		"SET_PARAMETER" : setParameter,	// metadata, volume control
		"GET_PARAMETER" : getParameter // asked for by iOS?
	 };
};