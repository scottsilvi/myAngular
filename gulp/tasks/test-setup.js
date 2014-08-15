var gulp = require('gulp');
var handleErrors = require('../util/handleErrors');

gulp.task('test-setup', ['vendor-js'], function() {
	return gulp
		.src([
			'build/bundle.vendor.*'
		])
		.on('error', handleErrors)
		.pipe(gulp.dest('test/harness/'))
});