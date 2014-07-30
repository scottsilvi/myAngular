/* jshint globalstrict: true */
/* global parse: false */
'use strict';
var parse = require('../src/parse');

describe('parse', function () {
	it('can parse an integer', function () {
		var fn = parse('42');
		expect(fn).to.be.defined;
		expect(fn()).to.equal(42);
	});

	it('makes integers both constant and literal', function () {
		var fn = parse('42');
		expect(fn.constant).to.be.true;
		expect(fn.literal).to.be.true;
	});

	it('can parse a floating point number', function () {
		var fn = parse('4.2');
		expect(fn()).to.equal(4.2);
	});

	it('can parse a floating point number without an integer part', function () {
		var fn = parse('.42');
		expect(fn()).to.equal(0.42);
	});

	it('can parse a number in scientific notation', function () {
		var fn = parse('42e3');
		expect(fn()).to.equal(42000);
	});

	it('can parse scientific notation with a float coefficient', function () {
		var fn = parse('.42e2');
		expect(fn()).to.equal(42);
	});

	it('can parse scientific notation with negative exponents', function() {
		var fn = parse('4200e-2');
		expect(fn()).to.equal(42);
	});

	it('can parse scientific notation with the + sign', function () {
		var fn = parse('.42e+2');
		expect(fn()).to.equal(42);
	});

	it('can parse upcase scientific notation', function () {
		var fn = parse('.42E2');
		expect(fn()).to.equal(42);
	});

	it('will not parse invalid scientific notation', function () {
		expect(function () { parse('42e-'); }).to.throw();
		expect(function () { parse('42e-a'); }).to.throw();
	});

	it('can parse a string in single quotes', function () {
		var fn = parse("'abc'");
		expect(fn()).to.equal('abc');
	});

	it('can parse a string in double quotes', function () {
		var fn = parse('"abc"');
		expect(fn()).to.equal('abc');
	});

	it('will not parse a string with mismatched quotes', function () {
		expect(function () { parse('"abc\''); }).to.throw();
	});

	it('marks strings both constant and literal', function () {
		var fn = parse('"abc"');
		expect(fn.constant).to.be.true;
		expect(fn.literal).to.be.true;
	});

	it('will parse a string with character escapes', function () {
		var fn = parse('"\\n\\r\\\\"');
		expect(fn()).to.equal('\n\r\\');
	});

	it('will parse a string with unicode escapes', function () {
		var fn = parse('"\\u00A0"');
		expect(fn()).to.equal('\u00A0');
	});

	it('will not parse a string with invalid unicode escapes', function () {
		expect(function () { parse('"\\u00T0"'); }).to.throw();
	});

	it('will parse null', function () {
		var fn = parse('null');
		expect(fn()).to.be.null;
	});

	it('will parse true', function () {
		var fn = parse('true');
		expect(fn()).to.be.true;
	});

	it('will parse true', function () {
		var fn = parse('false');
		expect(fn()).to.be.false;
	});

	it('marks booleans as literal and constant', function () {
		var fn = parse('true');
		expect(fn.literal).to.be.true;
		expect(fn.constant).to.be.true;
	});

	it('marks null as literal and constant', function () {
		var fn = parse('null');
		expect(fn.literal).to.be.true;
		expect(fn.constant).to.be.true;
	});

	it('ignores whitespace', function () {
		var fn = parse(' \n42 ');
		expect(fn()).to.equal(42);
	});

	it('will parse an empty array', function () {
		var fn = parse('[]');
		expect(fn()).to.deep.equal([]);
	});

	it('will parse a non-empty array', function() {
		var fn = parse('[1, "two", [3]]');
		expect(fn()).to.deep.equal([1, 'two', [3]]);
	});

	it('will parse an array with trailing commas', function () {
		var fn = parse('[1, 2, 3, ]');
		expect(fn()).to.deep.equal([1, 2, 3]);
	});

	it('marks array literals as literal and constant', function () {
		var fn = parse('[1, 2, 3]');
		expect(fn.literal).to.be.true;
		expect(fn.constant).to.be.true;
	})
});