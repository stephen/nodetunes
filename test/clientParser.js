"use strict";

var events = require('events');
var util = require('util');

var HEADER_TERMINATOR = '\r\n\r\n';
var LINE_TERMINATOR = '\r\n';

function MessageData(data) {
  this.headers = data.headers || {};
  this.protocol = data.protocol;
  this.content = data.content;
  this.statusCode = data.statusCode;
  this.statusMessage = data.statusMessage;
}

MessageData.prototype.getHeader = function(header) {
  return this.headers[header.toLowerCase()];
};

var parseHeader = function(header) {
  var lines = header.split(LINE_TERMINATOR);

  var methodline = lines[0].trim().split(' ');

  var protocol = methodline[0];
  var statusCode = methodline[1];
  var statusMessage = methodline.slice(2, methodline.length).join(' ');
  var output = {};

  output.protocol = protocol;
  output.statusCode = parseInt(statusCode);
  output.statusMessage = statusMessage;

  var headers = {};
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i];
    var headerline = line.split(/:(.+)/);
    if (headerline.length >= 2) {
      headers[headerline[0].toLowerCase()] = headerline[1].trim(); 
    } else {
      output.error = true;
      output.message = 'invalid header specified (' + headerline[0] + ')';
      return output;
    }
  }
  output.headers = headers;

  if (headers['content-length']) {
    output.contentLength = parseInt(headers['content-length']);
    output.hasContent = true;
  }

  return output;
};

var Parser = function(socket, options) {
  var buffer = new Buffer(0);
  var collectingContent = -1;
  var headerData = null;
  var output = null;
  this.options = options || {};

  socket.on('data', function(d) {
    buffer = Buffer.concat([ buffer, d ]);
    var strBuffer = buffer.toString();

    if (collectingContent == -1 && strBuffer.indexOf(HEADER_TERMINATOR) != -1) {
      var msgs = strBuffer.split(HEADER_TERMINATOR);

      // parse first header
      headerData = parseHeader(msgs[0]);
      if (headerData.error) {
        this.emit('error', headerData.message);
      } else {

        buffer = buffer.slice(msgs[0].length + 4);
        if (!headerData.hasContent) {

          // done - need to forward request
          this.emit('message', new MessageData({ headers: headerData.headers, statusCode: headerData.statusCode, statusMessage: headerData.statusMessage, protocol: headerData.protocol }));

        } else {
          // not done - need to get content data
          collectingContent = headerData.contentLength;
        }
      }
    }

    if (collectingContent >= 0 && collectingContent - buffer.length <= 0) { 
      // done
      var content = buffer.slice(0, collectingContent);

      this.emit('message', new MessageData({ headers: headerData.headers, method: headerData.method, content: content, statusMessage: headerData.statusMessage, protocol: headerData.protocol }));

      buffer = buffer.slice(collectingContent + 1);

      collectingContent = -1;
    }
  }.bind(this));
};

util.inherits(Parser, events.EventEmitter);

module.exports = Parser;
module.exports.parseHeader = parseHeader;
