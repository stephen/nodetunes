var audioProcessor = function(rtspServer) {
	var self = this;

	self.process = function(audio, sequenceNumber) {
		var swapBuf = new Buffer(audio.length);

		for (var i = 0; i < audio.length; i += 2) {
			swapBuf[i] = audio[i + 1];
			swapBuf[i + 1] = audio[i];
		}

		rtspServer.options.outStream.write(swapBuf);
	};

};

module.exports = audioProcessor;