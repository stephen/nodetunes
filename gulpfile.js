var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

gulp.task('default', function () {
	gulp.src('./test/*.js')
		.pipe(mocha({reporter: 'spec' }));

    gulp.src('./lib/*.js')
        .pipe(jshint({ "node" : true }))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});