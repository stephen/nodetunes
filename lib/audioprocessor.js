var PriorityQueue = require('priorityqueuejs');

var audioProcessor = function(rtspServer) {
	var self = this;

	var bufferQueue = new PriorityQueue(function(a, b) {
		return b.sequenceNumber - a.sequenceNumber;
	});

	self.process = function(audio, sequenceNumber) {
		var swapBuf = new Buffer(audio.length);

		for (var i = 0; i < audio.length; i += 2) {
			swapBuf[i] = audio[i + 1];
			swapBuf[i + 1] = audio[i];
		}


		bufferQueue.enq({ buffer: swapBuf, sequenceNumber: sequenceNumber });

		while (bufferQueue.size() >= 50) {
			rtspServer.options.outStream.write(bufferQueue.deq().buffer);
		}
	};

};

module.exports = audioProcessor;