var bundleLogger = require('./bundleLogger');
var handleErrors = require('./handleErrors');
var source = require('vinyl-source-stream');
var gulp = require('gulp');


module.exports = function (bundler, outputName, outputDest) {


	var bundle = function () {
		// Log when bundling starts
		bundleLogger.start();

		return bundler
			// Enable source maps!
			.bundle()
			// Report compile errors
			.on('error', handleErrors)
			// Use vinyl-source-stream to make the stream
			//  gulp compatible. Specify the desired output
			//  file name here
			.pipe(source(outputName))
			// Specify the output destination
			.pipe(gulp.dest(outputDest))
			// Log when bundling completes!
			.on('end', bundleLogger.end);
	};

	if(global.isWatching) {
		// Rebundle with watchify on changes.
		bundler.on('update', bundle);
	}

	return bundle();
};