(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint globalstrict: true */
'use strict';

var Scope = function () {};

module.exports = Scope;
},{}],2:[function(require,module,exports){
/* jshint globalstrict:true */
'use strict';

var Scope = require('../src/scope');
var _ = require('lodash');

describe('Scope', function () {
	it('can be constructed and used as an object', function () {
		var scope = new Scope();
		scope.aProperty = 1;
		expect(scope.aProperty).to.equal(1);
	});

	describe('digest', function () {

		var scope;

		beforeEach(function () {
			scope = new Scope();
		});

		it('calls the listener function of a watch on first $digest', function () {
			var watchFn = function () { return 'wat'; };
			var listenerFn = sinon.spy();
			scope.$watch(watchFn, listenerFn);

			scope.$digest();

			expect(listenerFn.called).to.be.true;
		});
	});
});
},{"../src/scope":1,"lodash":"K2RcUv"}]},{},[2])