"use strict";
var alac = require('libalac');

var PriorityQueue = require('priorityqueuejs');

function AudioProcessor(rtspServer) {

  this.rtspServer = rtspServer;
  this.state = 'buffering';

  this.bufferQueue = new PriorityQueue(function(a, b) {
    return b.sequenceNumber - a.sequenceNumber;
  });

}

AudioProcessor.prototype.makeMagicCookie = function(){
  //description of magic cookie: http://alac.macosforge.org/trac/browser/trunk/ALACMagicCookieDescription.txt

  //options is exactly the value of cookie: {Frames per packet} 0 16 40 10 14 2 255 0 0 44100
  var options = this.rtspServer.audioOptions;

  //todo: set value using options
  var arrCookie = [
    '0x00','0x00','0x10','0x60', //352 frames per seconds
    '0x00', //compatible: 0
    '0x10', //bits depth: 16
    '0x28', //unused: 40
    '0x0A', //unused: 10
    '0x0E', //unused: 14
    '0x02', //numChannels: 02 stereo
    '0x00','0xFF', //unused: 255
    '0x00','0x00','0x00','0x00', //maxFrameBytes: 0 unknown
    '0x00','0x00','0x00','0x00', //avgBitRate:0 unknown
    '0x00','0x00','0xac','0x44', //sampleRate: 44100
  ];
  var buffer = new Buffer(arrCookie.length);
  for(var i=0;i<arrCookie.length;i++){
    buffer[i] = parseInt(arrCookie[i], 16);
  }
  return buffer;
}

AudioProcessor.prototype.processPCM = function(pcmData, sequenceNumber){
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
}

AudioProcessor.prototype.decodeALAC = function(alacData, callback){
  var dec = alac.decoder({
    cookie: this.makeMagicCookie(),
    channels: 2,
    bitDepth: 16,
    framesPerPacket: 352
    //packets: null //no idea what this is
  });
  dec.end(alacData);

  var chunks = [];
  dec.on('readable', function() {
    var chunk = dec.read();
    if (chunk)
      chunks.push(chunk);
  });
  dec.on('end', function() {
    var outb = Buffer.concat(chunks);
    callback(outb);
  });
}

AudioProcessor.prototype.process = function(audio, sequenceNumber) {
  if(this.rtspServer.audioCodec.indexOf('L16') > 0){
    //PCM
    this.processPCM(audio,sequenceNumber);
  }else if(this.rtspServer.audioCodec.indexOf('AppleLossless') > 0){
    //ALAC
    this.decodeALAC(audio,function(pcm){
      this.processPCM(pcm,sequenceNumber);
    });
  }else{
    //Not supported codec
  }
};

module.exports = AudioProcessor;
