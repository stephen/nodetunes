'use strict';

module.exports = BaseDecoderStream;

var Readable = require('readable-stream').Readable;
var PriorityQueue = require('priorityqueuejs');
var util = require('util');

function BaseDecoderStream() {
  Readable.call(this);

  this.isFlowing = true;
  this.bufferQueue = new PriorityQueue(function(a, b) {
    return b.sequenceNumber - a.sequenceNumber;
  });
};

util.inherits(BaseDecoderStream, Readable);

BaseDecoderStream.prototype.add = function(chunk, sequenceNumber, isRetransmit) {
  this._push({ chunk: chunk, sequenceNumber: sequenceNumber });
};

BaseDecoderStream.prototype._push = function(data) {
  if (this.isFlowing) {
    var result = this.push(data.chunk);
    if (!result) {
      this.isFlowing = false;
    }
    return result;
  } else {
    this.bufferQueue.enq(data);
  }
};

BaseDecoderStream.prototype._read = function() {
  this.isFlowing = true;
  if (this.bufferQueue.size() === 0) return;
  while (this.bufferQueue.size() > 0) {
    if (!this._push(this.bufferQueue.deq())) return;
  }
};
