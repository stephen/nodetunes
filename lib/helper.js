'use strict';

var forge = require('node-forge');
var rsa = forge.pki.rsa;

var fs = require('fs');
var crypto = require('crypto');
var debug = require('debug')('nodetunes:helper');

var parseSdp = function(msg) {
  var multi = ['a', 'p', 'b'];

  var lines = msg.split('\r\n');
  var output = {};
  for (var i = 0; i < lines.length; i++) {

    var sp = lines[i].split(/=(.+)?/);
    if (sp.length == 3) { // for some reason there's an empty item?
      if (multi.indexOf(sp[0]) != -1) { // some attributes are multiline...
        if (!output[sp[0]])
          output[sp[0]] = [];

        output[sp[0]].push(sp[1]);
      } else {
        output[sp[0]] = sp[1];
      }
    }
  }

  return output;
};

var dmapTypes = {
  mper: 8,
  asal: 'str',
  asar: 'str',
  ascp: 'str',
  asgn: 'str',
  minm: 'str',
  astn: 2,
  asdk: 1,
  caps: 1,
  astm: 4,
};

var parseDmap = function(buffer) {
  var output = {};

  for (var i = 8; i < buffer.length;) {
    var itemType = buffer.slice(i, i + 4);
    var itemLength = buffer.slice(i + 4, i + 8).readUInt32BE(0);
    if (itemLength !== 0) {
      var data = buffer.slice(i + 8, i + 8 + itemLength);
      if (dmapTypes[itemType] == 'str') {
        output[itemType.toString()] = data.toString();
      } else if (dmapTypes[itemType] == 1) {
        output[itemType.toString()] = data.readUInt8(0);
      } else if (dmapTypes[itemType] == 2) {
        output[itemType.toString()] = data.readUInt16BE(0);
      } else if (dmapTypes[itemType] == 4) {
        output[itemType.toString()] = data.readUInt32BE(0);
      } else if (dmapTypes[itemType] == 8) {
        output[itemType.toString()] = (data.readUInt32BE(0) << 8) + data.readUInt32BE(4);
      }
    }

    i += 8 + itemLength;
  }

  return output;
};

var getPrivateKey = function() {

  var keyFile = fs.readFileSync(__dirname + '/../private.key');
  var privkey = forge.pki.privateKeyFromPem(keyFile);

  return privkey;
};

var privateKey = getPrivateKey();

var generateAppleResponse = function(challengeBuf, ipAddr, macAddr) {
  debug = require('debug')('nodetunes:helper'); // HACK: need to reload debug here (https://github.com/visionmedia/debug/issues/150)
  debug('building challenge for %s (ip: %s, mac: %s)', challengeBuf.toString('base64'), ipAddr.toString('hex'), macAddr.toString('hex'));

  var fullChallenge = Buffer.concat([challengeBuf, ipAddr, macAddr]);

  // im sure there's an easier way to pad this buffer
  var padding = [];
  for (var i = fullChallenge.length; i < 32; i++) {
    padding.push(0);
  }

  fullChallenge = Buffer.concat([fullChallenge, new Buffer(padding)]).toString('binary');
  var response = forge.pki.rsa.encrypt(fullChallenge, privateKey, 0x01);
  debug('computed challenge: %s', forge.util.encode64(response));

  return forge.util.encode64(response);
};

var generateRfc2617Response = function(username, realm, password, nonce, uri, method) {

  var md5 = function(content) {
    return crypto.createHash('md5').update(content).digest().toString('hex');
  };

  var ha1 = md5(username + ':' + realm + ':' + password);
  var ha2 = md5(method + ':' + uri);
  var response = md5(ha1 + ':' + nonce + ':' + ha2);

  return response;
};

module.exports.parseSdp = parseSdp;
module.exports.parseDmap = parseDmap;
module.exports.generateAppleResponse = generateAppleResponse;
module.exports.generateRfc2617Response = generateRfc2617Response;
module.exports.rsaPrivateKey = privateKey;
