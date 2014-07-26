var gulp = require('gulp');
var bundle = require('../util/bundle');
var browserify = require('browserify');
var watchify = require('watchify');

gulp.task('vendor-js', function () {
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