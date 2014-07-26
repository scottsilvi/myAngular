var gulp = require('gulp');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
var handleErrors = require('../util/handleErrors');


gulp.task('test', ['test-setup', 'browserify-test'], function () {
	return gulp
		.src('test/harness/index.html')
		.pipe(mochaPhantomJS())
		.on('error', handleErrors);
});
