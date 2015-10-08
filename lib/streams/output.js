'use strict';

module.exports = OutputStream;

var PassThrough = require('readable-stream').PassThrough;
var BaseStream = require('./base');
var util = require('util');

function OutputStream() {
  PassThrough.call(this);

  this.baseStream = new BaseStream();
  this.decoder = null;
};

util.inherits(OutputStream, PassThrough);

OutputStream.prototype.setDecoder = function(decoder) {
  this.decoder = decoder;
  this.baseStream.pipe(decoder).pipe(this);
};

OutputStream.prototype.add = function(chunk, sequenceNumber) {
  this.baseStream.add(chunk, sequenceNumber);
};
