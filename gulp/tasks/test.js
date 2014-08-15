var gulp = require('gulp');
var mochaPhantomJS = require('gulp-mocha-phantomjs');
var handleErrors = require('../util/handleErrors');

gulp.task('test', ['setWatch', 'test-setup', 'browserify-test'], function () {
	return gulp
		.src('test/harness/index.html')
		.pipe(mochaPhantomJS())
		.on('error', handleErrors);
});

gulp.task('test:watch', ['setWatch'], function() {
	gulp.start('test');
	gulp.watch(['test/harness/bundle.test.js'], function() {
		process.stdout.write("\u001B[2J\u001B[0;0f");
		gulp.start('test');
	});
});