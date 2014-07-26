var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jsHintOptions = {
	globals: {
		$: false,
		require: false,
		sinon: false,
		module: false,
		describe: false,
		it: false,
		expect: false,
		beforeEach: false
	},
	browser: true,
	devel: true
};

gulp.task('lint', function () {
	console.log('\n\n*** Linting JavaScript Files ***\n\n');
	
	gulp.src(['src/**/*.js'])
		.pipe(jshint(jsHintOptions))
		.pipe(jshint.reporter('default'));
});