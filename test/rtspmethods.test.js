var net = require('net');
var assert = require('assert');
var daap = require('node-daap');
var Nodetunes = require('../index');
var Parser = require('httplike').ClientParser;
var helper = require('../lib/helper');

describe('RTSP Methods', function() {

  // test constants

  var rsaAesKey = 'ldAdTcI8b2okzDhz3bCnFPwwMVwwGCVt8+0bqURzomwUVWh5gwuee14E8FszGvrJvl5+3lfXMMDw3MRTO4arG380WNq3hl7H+ck' +
    'wgID2ZiV3YgSwh/oVA5QieD65m5vtYyNqe1dypQHOE0Fz/fOXb5ySpmzVvbJbMKP7H7DucpoXTWvk9CHMLZU8z9vWUVxMi862FPNLFWfrCE9NBM' +
    'bwFk2r40QdbYC5fd+6d/ynrDLit6V5T/l8ESi6tcC4vRFrM8j2gQkGwLilpbKL+k38rBvZK+zTs8k/k25zOb7xtfrKoWJ7soIska+unVnEF5ILE' +
    'XyE3eg0NsB/IrmqKIrV9Q==';
  var rsaAesIv = 'VkH+lhtE7jGkV5rUPM64aQ==';
  var codec = '96 L16/44100/2';
  var macAddress = '5F513885F785';

  var announceContent = 'v=0\r\no=AirTunes 7709564614789383330 0 IN IP4 172.17.104.138\r\ns=AirTunes\r\n' +
    'i=Stephen\'s iPad\r\nc=IN IP4 172.17.104.138\r\nt=0 0\r\nm=audio 0 RTP/AVP 96\r\na=rtpmap:' + codec + '\r\n' +
    'a=rsaaeskey:' + rsaAesKey + '\r\na=aesiv:' + rsaAesIv + '\r\na=min-latency:11025\r\na=max-latency:88200';

  var server = null;
  var port = -1;
  var client = new net.Socket();
  var parser = new Parser(client);

  beforeEach(function(done) {
    client = new net.Socket();
    parser = new Parser(client);
    server = new Nodetunes({ macAddress: macAddress });
    server.start(function(err, d) {
      port = d.port;
      done();
    });

  });

  afterEach(function(done) {
    server.stop();
    client.end();
    done();
  });

  // tests

  describe('General', function() {

    it('should report CSeq correctly', function(done) {

      var x = 0;
      parser.on('message', function(m) {
        assert(m.getHeader('CSeq') === '' + x);
        x++;
        if (x === 100) {
          done();
        }
      });

      client.connect(port, 'localhost', function() {
        for (var i = 0; i < 100; i++) {
          client.write('OPTIONS * RTSP/1.0\r\nCSeq:' + i + '\r\nUser-Agent: AirPlay/190.9\r\n\r\n');
        }
      });

    });

    it('should only allow one client', function(done) {

      var secondClient = new net.Socket();
      var secondParser = new Parser(secondClient);

      secondParser.on('message', function(m) {
        assert.equal(m.statusCode, 453);
        assert.equal(m.statusMessage.toUpperCase(), 'NOT ENOUGH BANDWIDTH');
        secondClient.end();
        done();
      });

      client.connect(port, 'localhost', function() {

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + announceContent.length + '\r\n\r\n' + announceContent);

        parser.on('message', function(m) {
          secondClient.connect(port, 'localhost', function() {
            secondClient.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + announceContent.length + '\r\n\r\n' + announceContent);
          });
        });
      });

    });
  });

  describe('OPTIONS', function() {

    it('should respond with available method options', function(done) {

      parser.on('message', function(m) {
        assert(m.protocol === 'RTSP/1.0');
        assert(m.statusCode === 200);
        assert(m.statusMessage === 'OK');
        assert(m.getHeader('Server') === 'AirTunes/105.1');
        assert(m.getHeader('CSeq') === '0');
        assert(m.getHeader('Public') === 'ANNOUNCE, SETUP, RECORD, PAUSE, FLUSH, TEARDOWN, OPTIONS, GET_PARAMETER, SET_PARAMETER, POST, GET');
        done();
      });

      client.connect(port, 'localhost', function() {
        client.write('OPTIONS * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\n\r\n');
      });

    });

    it('should respond with to options with apple challenge response (TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        done();
      });

      client.connect(port, 'localhost', function() {
        client.write('OPTIONS * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nApple-Challenge: WkfiX/5gzeKemPDHyBwww==\r\n\r\n');
      });

    });
  });

  describe('ANNOUNCE', function() {

    it('should respond with announce acknowledgement', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        assert(server.rtspServer.audioCodec === codec);
        assert(server.rtspServer.audioAesKey.toString('base64') === helper.rsaPrivateKey.decrypt(new Buffer(rsaAesKey, 'base64').toString('binary'), 'RSA-OAEP').toString('base64'));
        assert(server.rtspServer.audioAesIv.toString('base64') === rsaAesIv);
        assert(server.rtspServer.metadata.clientName === 'Stephen\'s iPad');
        done();
      });

      client.connect(port, 'localhost', function() {

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + announceContent.length + '\r\n\r\n' + announceContent);
      });
    });

    it('should respond with password required (TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        assert(server.rtspServer.audioCodec === codec);
        assert(server.rtspServer.audioAesKey.toString('base64') === helper.rsaPrivateKey.decrypt(new Buffer(rsaAesKey, 'base64').toString('binary'), 'RSA-OAEP').toString('base64'));
        assert(server.rtspServer.audioAesIv.toString('base64') === rsaAesIv);
        done();
      });

      client.connect(port, 'localhost', function() {

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + announceContent.length + '\r\n\r\n' + announceContent);
      });

    });

    it('should respond with password validation (TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        assert(server.rtspServer.audioCodec === codec);
        assert(server.rtspServer.audioAesKey.toString('base64') === helper.rsaPrivateKey.decrypt(new Buffer(rsaAesKey, 'base64').toString('binary'), 'RSA-OAEP').toString('base64'));
        assert(server.rtspServer.audioAesIv.toString('base64') === rsaAesIv);
        done();
      });

      client.connect(port, 'localhost', function() {

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + announceContent.length + '\r\n\r\n' + announceContent);
      });

    });
  });

  describe('SETUP', function() {

    it('should respond with setup acknowledgement (TODO)', function(done) {
      var counter = 0;

      parser.on('message', function(m) {
        counter++;
        assert(m.statusCode === 200);

        // TODO: check client ports saved on server
        if (counter == 1) {
          client.write('SETUP * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nTransport:RTP/AVP/UDP;unicast;mode=record;timing_port=56631;x-events;control_port=62727\r\n\r\n');

        } else if (counter == 2) {
          assert(server.rtspServer.ports.length === 3);
          assert(typeof server.rtspServer.ports[0] === 'number');
          assert(typeof server.rtspServer.ports[1] === 'number');
          assert(typeof server.rtspServer.ports[2] === 'number');
          client.destroy();
          done();
        }
      });

      client.connect(port, 'localhost', function() {

        client.write('ANNOUNCE * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + announceContent.length + '\r\n\r\n' + announceContent);
      });

    });
  });

  describe('RECORD', function() {

    it('should respond with record acknowledgement (TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        done();
      });

      client.connect(port, 'localhost', function() {

        client.write('RECORD * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\n\r\n');
      });

    });
  });

  describe('FLUSH', function() {

    it('should respond with flush acknowledgement (IMPL TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        done();
      });

      client.connect(port, 'localhost', function() {

        client.write('FLUSH * RTSP/1.0\r\nCSeq:0\r\nUser-Agent: AirPlay/190.9\r\n\r\n');
      });

    });
  });

  describe('TEARDOWN', function() {

    it('should respond with teardown acknowledgement (TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        done();
      });

      client.connect(port, 'localhost', function() {
        client.write('OPTIONS * RTSP/1.0\r\nCSeq:2\r\nUser-Agent: AirPlay/190.9\r\n\r\n');
      });

    });
  });

  describe('GET_PARAMETER', function() {

    it('should respond with volume parameter (IMPL TODO)', function(done) {

      parser.on('message', function(m) {
        assert(m.statusCode === 200);
        done();
      });

      var content = 'volume';

      client.connect(port, 'localhost', function() {
        client.write('GET_PARAMETER * RTSP/1.0\r\nCSeq:2\r\nUser-Agent: AirPlay/190.9\r\nContent-Length:' + content.length + '\r\n\r\n' + content);
      });

    });
  });

  describe('SET_PARAMETER', function() {

    it('should set and acknowledge volume', function(done) {

      server.on('volumeChange', function(volume) {
        assert(volume === -2.25);
        done();
      });

      var content = 'volume: -2.250000';

      client.connect(port, 'localhost', function() {
        client.write('SET_PARAMETER * RTSP/1.0\r\nCSeq:2\r\nUser-Agent: AirPlay/190.9\r\nContent-Type:text/parameters\r\nContent-Length:' + content.length + '\r\n\r\n' + content);
      });

    });

    it('handles "metadataChange"', function(done) {
      server.on('metadataChange', function(data){
        assert.equal(data.asal, "Album Name");
        assert.equal(data.asar, "Artist");
        assert.equal(data.minm, "Track Name");
        done()
      })

      var name = daap.encode('minm', 'Track Name')
      var artist = daap.encode('asar', 'Artist')
      var album = daap.encode('asal', 'Album Name')
      var content = daap.encodeList('mlit', name, artist, album)

      client.connect(port, 'localhost', function() {
        client.write('SET_PARAMETER * RTSP/1.0\r\nCSeq:2\r\nUser-Agent: AirPlay/190.9\r\nContent-Type:application/x-dmap-tagged\r\nContent-Length:' + content.length + '\r\n\r\n' + content);
      });

    });
  });

});
