"use strict";

var PriorityQueue = require('priorityqueuejs');

var audioProcessor = function(rtspServer) {
  var self = this;

  var state = 'buffering';

  var bufferQueue = new PriorityQueue(function(a, b) {
    return b.sequenceNumber - a.sequenceNumber;
  });

  self.process = function(audio, sequenceNumber) {
    var swapBuf = new Buffer(audio.length);

    // endian hack
    for (var i = 0; i < audio.length; i += 2) {
      swapBuf[i] = audio[i + 1];
      swapBuf[i + 1] = audio[i];
    }

    if (bufferQueue.length < 5) {
      state = 'buffering';
    }

    bufferQueue.enq({ buffer: swapBuf, sequenceNumber: sequenceNumber });

    if (state == 'active') {
      while (bufferQueue.size() >= 5) {
        rtspServer.options.outStream.write(bufferQueue.deq().buffer);
      }
    } else if (bufferQueue.size() >= 100) {
      state = 'active';
    }

  };

};

module.exports = audioProcessor;
