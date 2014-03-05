"use strict";

var crypto = require('crypto');
var username = 'iTunes';
var realm = 'roap';
var password = 'lol';
var nonce = 'd41d8cd98f00b204e9800998ecf8427e';
var uri = 'rtsp://127.0.0.1/11922049579795367594';
var method = 'ANNOUNCE';

var ha1 = crypto.createHash('md5').update(username + ':' + realm + ':' + password).digest().toString('hex');
var ha2 = crypto.createHash('md5').update(method + ':' + uri).digest().toString('hex');
var response = crypto.createHash('md5').update(ha1 + ':' + nonce + ':' + ha2).digest().toString('hex');

console.log(response);
