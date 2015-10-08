'use strict';

module.exports = PcmDecoderStream;

var Transform = require('readable-stream').Transform;
var util = require('util');

function PcmDecoderStream() {
  Transform.apply(this, arguments);
};

util.inherits(PcmDecoderStream, Transform);

PcmDecoderStream.prototype._transform = function(pcmData, enc, cb) {
  var swapBuf = new Buffer(pcmData.length);

  // endian hack
  for (var i = 0; i < pcmData.length; i += 2) {
    swapBuf[i] = pcmData[i + 1];
    swapBuf[i + 1] = pcmData[i];
  };

  cb(null, swapBuf);
};
