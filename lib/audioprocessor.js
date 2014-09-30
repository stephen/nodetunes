"use strict";

var PriorityQueue = require('priorityqueuejs');

function AudioProcessor(rtspServer) {

  this.rtspServer = rtspServer;
  this.state = 'buffering';

  this.bufferQueue = new PriorityQueue(function(a, b) {
    return b.sequenceNumber - a.sequenceNumber;
  });

}

AudioProcessor.prototype.process = function(audio, sequenceNumber) {
  var swapBuf = new Buffer(audio.length);

  // endian hack
  for (var i = 0; i < audio.length; i += 2) {
    swapBuf[i] = audio[i + 1];
    swapBuf[i + 1] = audio[i];
  }

  if (this.bufferQueue.length < 4) {
    this.state = 'buffering';
  }

  this.bufferQueue.enq({ buffer: swapBuf, sequenceNumber: sequenceNumber });

  if (this.state == 'active') {
    while (this.bufferQueue.size() >= 4) {
      this.rtspServer.outputStream.write(this.bufferQueue.deq().buffer);
    }
  } else if (this.bufferQueue.size() >= 200) {
    this.state = 'active';
  }
};

module.exports = AudioProcessor;
