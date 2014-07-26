/*  browserify Task
	---------------
	Bundle javascripty things with browserify!

	If the watch task is running, this uses watchify instead
	or browserify for faster bundling using caching
*/

var gulp = require('gulp');
var browserify = require('browserify');
var watchify = require('watchify');
var bundle = require('../util/bundle');
var glob = require('glob');

gulp.task('browserify', function () {
	var bundleMethod = global.isWatching ? watchify : browserify;

	var bundler = bundleMethod({
		// Specify the entry point of the app
		entries: ['./src/app.js'],
		debug: true
	});
	return bundle(bundler, 'myAngular.min.js', './build/');
});

gulp.task('browserify-test', function () {
	var bundleMethod = global.isWatching ? watchify : browserify;

	var vendorModules = ['lodash'];

	var bundler = bundleMethod(glob.sync('./test/**/*_spec.js'));

	vendorModules.forEach(function(module) {
		bundler.external(module);
	});

	return bundle(bundler, 'bundle.test.js', 'test/harness/');
});