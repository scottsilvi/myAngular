/* jshint globalstrict: true */
/* global setupModuleLoader: false */
'use strict';

var setupModuleLoader = require('../src/loader');

describe('setupModuleLoader', function () {

	beforeEach(function () {
		delete window.angular;
	});

	it('exposes angular on the window', function() {
		setupModuleLoader(window);
		expect(window.angular).to.be.defined;
	});

	it('creates angular just once', function () {
		setupModuleLoader(window);
		var ng = window.angular;
		setupModuleLoader(window);
		expect(window.angular).to.deep.equal(ng);
	});

	it('exposes the angular module function', function () {
		setupModuleLoader(window);
		expect(window.angular.module).to.be.defined;
	});

	it('exposes the angular module function just once', function () {
		setupModuleLoader(window);
		var module = window.angular.module;
		setupModuleLoader(window);
		expect(window.angular.module).to.deep.equal(module);
	});

	describe('modules', function () {

		beforeEach(function () {
			setupModuleLoader(window);
		});

		it('allows registering a module', function () {
			var myModule = window.angular.module('myModule', []);
			expect(myModule).to.be.defined;
			expect(myModule.name).to.equal('myModule');
		});

		it('replaces a module when registered with the same name again', function () {
			var myModule = window.angular.module('myModule', []);
			var myNewModule = window.angular.module('myModule', []);
			expect(myNewModule).to.not.equal(myModule);
		});

		it('attaches the requires array to the registered module', function () {
			var myModule = window.angular.module('myModule', ['myOtherModule']);
			expect(myModule.requires).to.deep.equal(['myOtherModule']);
		});

		it('allows getting a module', function () {
			var myModule = window.angular.module('myModule',[]);
			var gotModule = window.angular.module('myModule');

			expect(gotModule).to.be.defined;
			expect(gotModule).to.equal(myModule);
		});

		it('throws when trying to get a nonexistant module', function () {
			expect(function () {
				window.angular.module('myModule');
			}).to.throw;
		});

		it('does not allow a module to be called hasOwnProperty', function () {
			expect(function () {
				window.angular.module('hasOwnProperty', []);
			}).to.throw;
		});
	});
});