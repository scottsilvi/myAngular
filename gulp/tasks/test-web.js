var gulp = require('gulp');
var connect = require('connect');
var serveStatic = require('serve-static');
var serverPort = process.env.PORT || 3000;
var util = require('gulp-util');
var prettyHrtime = require('pretty-hrtime');
var open = require('open');

gulp.task('test-web', ['test-setup', 'browserify-test'], function(next) {
	connect()
		.use(require('connect-livereload')())
		.use(serveStatic(process.cwd() + '/test/harness'))
		.listen(serverPort, function(err) {
			next(err);
			util.log('\n  Test Server ready and listening with LiveReload enabled at:\n\n  ', 
				util.colors.green("http://localhost:" + serverPort + "/"));

			open('http://localhost:' + serverPort + '/');
		});
});