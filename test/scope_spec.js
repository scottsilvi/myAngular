/* jshint globalstrict:true */
/* global Scope: false */
'use strict';

var Scope = require('../src/scope');
require('../src/myAngular');
var _ = require('lodash');
var assert = require('assert');

describe('Scope', function () {
	it('can be constructed and used as an object', function () {
		var scope = new Scope();
		scope.aProperty = 1;
		expect(scope.aProperty).to.equal(1);
	});
});