var gulp = require('gulp');

gulp.task('test-setup', ['vendor-js'], function() {
	return gulp
		.src([
			'build/bundle.vendor.*'
		])
		.pipe(gulp.dest('test/harness/'))
});