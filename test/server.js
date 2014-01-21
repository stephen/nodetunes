var nodetunes = require('../index.js');
var Speaker = require('speaker');

nodetunes(new Speaker({
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100
}));