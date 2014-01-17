var messageBuilder = function(initialState) {
	var buffer = '';
	var self = this;

	this.addHeader = function(header, data) {
		buffer += header + ": " + data + "\r\n";
	};

	this.setOK = function(cseq) {
		buffer += "RTSP/1.0 200 OK\r\n";
		if (cseq) {
			self.addHeader('CSeq', cseq);
		}
	};

	this.send = function(socket) {
		socket.end(buffer);
	};
};

module.exports.MessageBuilder = messageBuilder;