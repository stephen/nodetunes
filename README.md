NodeTunes
=========
[![build status](https://secure.travis-ci.org/stephen/nodetunes.png)](http://travis-ci.org/stephen/nodetunes)

nodetunes is an implementation of the Apple AirTunes v2 (audio AirPlay) protocol written in node.js.

```
npm install nodetunes
```

See ```examples/server.js``` for example usage.

Changelog
---------

##### 0.0.17
- Fixed bug where unknown request method (e.g. `GET`) would crash session
- Removed legacy `MessageBuilder` responses
- Fixed buggy response errors to use `httplike` errors

##### 0.0.16
- Added support for fetching human-readable client name

##### 0.0.14
- Solved issues created in 0.0.12
- Fixed clientConnected/clientDisconnected issues
- Correct cleanup for RTP binding

##### 0.0.12
- EXPERIMENTAL - added testing infrastructure, refactoring.
- Moved to httplike v0.0.7 (trim on method support, solves )

##### 0.0.11
- Fixed 'undefined' bug in RTSP replies

##### 0.0.10
- Fixed scope leakage issues
- Fixed file naming issues

##### 0.0.7
- Changed output audio stream pattern to better match callback pattern. See new ```examples/server.js```

