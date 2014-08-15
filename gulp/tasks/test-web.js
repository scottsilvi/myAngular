var gulp = require('gulp');
var connect = require('gulp-connect');
var serverPort = process.env.PORT || 3000;
var handleErrors = require('../util/handleErrors');
var util = require('gulp-util');
var open = require('open');

gulp.task('connect', function() {
	connect.server({
		root: [process.cwd() + '/test/harness'],
		port: serverPort,
		livereload: true
	});
});

gulp.task('test:web', ['setWatch', 'test-setup', 'browserify-test', 'connect'], function (next) {
	gulp.src('./test/**/*_spec.js')
		.on('error', handleErrors)
    	.pipe(connect.reload());

	open('http://localhost:' + serverPort + '/');
	next();
})