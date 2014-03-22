"use strict";

var AirTunesServer = require('../index');
var Speaker = require('speaker');

var server = new AirTunesServer(process.stdout);

server.start();
