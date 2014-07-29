var gulp = require('gulp');
var gulpUtil = require('gulp-util');
var bundle = require('../util/bundle');
var browserify = require('browserify');
var watchify = require('watchify');

gulp.task('vendor-js', function (next) {
	if (require('fs').existsSync('build/bundle.vendor.js')) {
		gulpUtil.log('... bundle.vendor.js exists, skipping. Run gulp clean or gulp dev:clean to force recreation of vendor bundle.');
		return next();
	}

	var bundleMethod = global.isWatching ? watchify : browserify;
	var vendorModules = ['lodash'];

	var bundler = bundleMethod({
		// Specify the entry point of the app
		entries: ['./src/vendor.js']
	});

	vendorModules.forEach(function(module) {
		bundler.require(module);
	});

	return bundle(bundler, 'bundle.vendor.js','./build');
});