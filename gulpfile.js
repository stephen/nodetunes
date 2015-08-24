var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jscs = require('gulp-jscs');

gulp.task('test', function() {
  gulp.src('./test/*.js')
    .pipe(mocha({ reporter: 'spec' }));
});

gulp.task('lint', function() {
  gulp.src('./**/*.js')
    .pipe(jscs());
});

gulp.task('default', ['test', 'lint']);
