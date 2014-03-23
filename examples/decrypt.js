"use strict";

var ursa = require('ursa');
var fs = require('fs');
var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function (data) {

  var privkey = ursa.createPrivateKey(fs.readFileSync('private.key'));
  var response = privkey.publicDecrypt(data, 'base64', 'hex');

  console.log(response);
});
