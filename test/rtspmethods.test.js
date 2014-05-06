var net = require('net');
var assert = require('assert');
var Nodetunes = require('../index');
var Parser = require('./clientParser');
var helper = require('../lib/helper');

describe('RTSP Methods', function() {

  // test constants

  var rsaAesKey = 'ldAdTcI8b2okzDhz3bCnFPwwMVwwGCVt8+0bqURzomwUVWh5gwuee14E8FszGvrJvl5+3lfXMMDw3MRTO4arG380WNq3hl7H+ck' +
    'wgID2ZiV3YgSwh/oVA5QieD65m5vtYyNqe1dypQHOE0Fz/fOXb5ySpmzVvbJbMKP7H7DucpoXTWvk9CHMLZU8z9vWUVxMi862FPNLFWfrCE9NBM' +
    'bwFk2r40QdbYC5fd+6d/ynrDLit6V5T/l8ESi6tcC4vRFrM8j2gQkGwLilpbKL+k38rBvZK+zTs8k/k25zOb7xtfrKoWJ7soIska+unVnEF5ILE' +
    'XyE3eg0NsB/IrmqKIrV9Q==';
  var rsaAesIv = 'VkH+lhtE7jGkV5rUPM64aQ==';
  var codec = '96 L16/44100/2';

  var server = null;
  var port = -1;
  var client = new net.Socket();
  var parser = new Parser(client);

  beforeEach(function(done) {    
    client = new net.Socket();
    parser = new Parser(client);
    server = new Nodetunes({ macAddress: '5F513885F785' });
    server.start(function(err, d) {
      port = d.port;
      done();
    });
  });

  // tests

  describe('General', function() {

    it('should should only allow one client', function(done) {


      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        assert(server.rtspServer.audioCodec === codec);
        assert(server.rtspServer.audioAesKey.toString('base64') === helper.rsaOperations.decrypt(new Buffer(rsaAesKey, 'base64')).toString('base64'));
        assert(server.rtspServer.audioAesIv.toString('base64') === rsaAesIv);
        done();
      });

      client.connect(port, 'localhost', function() {

        var content = 'v=0\r\no=AirTunes 7709564614789383330 0 IN IP4 172.17.104.138\r\ns=AirTunes\r\n' +
          'i=Stephen\'s iPad\r\nc=IN IP4 172.17.104.138\r\nt=0 0\r\nm=audio 0 RTP/AVP 96\r\na=rtpmap:' + codec + '\r\n' +
          'a=rsaaeskey:' + rsaAesKey + '\r\na=aesiv:' + rsaAesIv + '\r\na=min-latency:11025\r\na=max-latency:88200';

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + content.length + '\r\n\r\n' + content);
      });

    });
  });

	describe('OPTIONS', function() {

    it('should report CSeq correctly', function(done) {

      var x = 0;
      parser.on('message', function(m) {
        assert(m.getHeader('CSeq') === '' + x);
        x++;
        done();
      });

      client.connect(port, 'localhost', function() {
        for (var i = 0; i < 100; i++) {
          client.write('OPTIONS * RTSP/1.0\r\nCSeq:' + i + '\r\nUser-Agent: AirPlay/190.9\r\n\r\n');        
        }
      });

    });

		it('should respond with available method options', function(done) {

			parser.on('message', function(m) {
				assert(m.protocol === 'RTSP/1.0');        
        assert(m.statusCode === 200);
        assert(m.statusMessage === 'OK');
				assert(m.getHeader('Server') === 'AirTunes/105.1');
				assert(m.getHeader('CSeq') === '0');
				assert(m.getHeader('Public') === 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET')
				done();
			});

			client.connect(port, 'localhost', function() {
				client.write('OPTIONS * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\n\r\n');
			});

		});

    it('should respond with to options with apple challenge response', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        //console.log(m.getHeader('Apple-Response'));
        done();
      });

      client.connect(port, 'localhost', function() {
        client.write('OPTIONS * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nApple-Challenge: WkfiX/5gzeKemPDHyBwww==\r\n\r\n');
      });

    });

	});

  describe('ANNOUNCE', function() {

    it('should respond with to announce acknowledgement', function(done) {

      var rsaAesKey = 'ldAdTcI8b2okzDhz3bCnFPwwMVwwGCVt8+0bqURzomwUVWh5gwuee14E8FszGvrJvl5+3lfXMMDw3MRTO4arG380WNq3hl7H+ck' +
        'wgID2ZiV3YgSwh/oVA5QieD65m5vtYyNqe1dypQHOE0Fz/fOXb5ySpmzVvbJbMKP7H7DucpoXTWvk9CHMLZU8z9vWUVxMi862FPNLFWfrCE9NBM' +
        'bwFk2r40QdbYC5fd+6d/ynrDLit6V5T/l8ESi6tcC4vRFrM8j2gQkGwLilpbKL+k38rBvZK+zTs8k/k25zOb7xtfrKoWJ7soIska+unVnEF5ILE' +
        'XyE3eg0NsB/IrmqKIrV9Q==';
      var rsaAesIv = 'VkH+lhtE7jGkV5rUPM64aQ==';
      var codec = '96 L16/44100/2';

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        assert(server.rtspServer.audioCodec === codec);
        assert(server.rtspServer.audioAesKey.toString('base64') === helper.rsaOperations.decrypt(new Buffer(rsaAesKey, 'base64')).toString('base64'));
        assert(server.rtspServer.audioAesIv.toString('base64') === rsaAesIv);
        done();
      });

      client.connect(port, 'localhost', function() {

        var content = 'v=0\r\no=AirTunes 7709564614789383330 0 IN IP4 172.17.104.138\r\ns=AirTunes\r\n' +
          'i=Stephen\'s iPad\r\nc=IN IP4 172.17.104.138\r\nt=0 0\r\nm=audio 0 RTP/AVP 96\r\na=rtpmap:' + codec + '\r\n' +
          'a=rsaaeskey:' + rsaAesKey + '\r\na=aesiv:' + rsaAesIv + '\r\na=min-latency:11025\r\na=max-latency:88200';

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + content.length + '\r\n\r\n' + content);
      });

    });
  });
});