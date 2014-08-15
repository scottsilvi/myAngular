/* jshint globalstrict: true */
/* global publishExternalAPI: false, createInjector, false  */
'use strict';

var createInjector = require('../src/injector');
var publishExternalAPI = require('../src/angular_public');
var _ = require('lodash');

describe('parse', function () {

	var parse;

	beforeEach(function () {
		publishExternalAPI();
		parse = createInjector(['ng']).get('$parse');
	});

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
	});

	it('will parse empty object', function () {
		var fn = parse('{}');
		expect(fn()).to.deep.equal({});
	});

	it('will parse non-empty object', function () {
		var fn = parse('{ a: 1, b: [2, 3], c: { d: 4 }}');
		expect(fn()).to.deep.equal({ a: 1, b: [2, 3], c: { d: 4 }});
	});

	it('will parse an object with string keys', function () {
		var fn = parse('{ "a key" : 1, \'another-key\': 2 }');
		expect(fn()).to.deep.equal({ 'a key' : 1, 'another-key': 2});
	});

	it('returns the function itself when given one', function () {
		var fn = function () {};
		expect(parse(fn)).to.equal(fn);
	});

	it('still returns a function when given no object', function () {
		assert.isFunction(parse());
	});

	it('looks up an attribute from the scope', function () {
		var fn = parse('aKey');
		expect(fn({ aKey: 42})).to.equal(42);
		expect(fn({})).to.be.undefined;
		expect(fn()).to.be.undefined;
	});

	it('looks up a 2-part identifier path from the scope', function () {
		var fn = parse('aKey.anotherKey');
		expect(fn({ aKey: { anotherKey: 42}})).to.equal(42);
		expect(fn({aKey: {}})).to.be.undefined;
		expect(fn({})).to.be.undefined;
	});

	it('looks up a 4-part identifier path from the scope', function () {
		var fn = parse('aKey.secondKey.thirdKey.fourthKey');
		expect(fn({ aKey: { secondKey: { thirdKey: { fourthKey: 42}}}})).to.equal(42);
		expect(fn({ aKey: { secondKey: { thirdKey: {}}}})).to.be.undefined;
		expect(fn({aKey: {}})).to.be.undefined;
		expect(fn({})).to.be.undefined;
	});

	it('uses locals instead of scope when there is a matching key', function () {
		var fn = parse('aKey');
		expect(fn({ aKey: 42}, { aKey: 43})).to.equal(43);
	});

	it('does not use locals instead of scope when no matching key', function () {
		var fn = parse('aKey');
		expect(fn({ aKey: 42}, { otherKey: 43})).to.equal(42);
	});

	it('uses locals when a 2-part key matches in locals', function () {
		var fn = parse('aKey.anotherKey');
		expect(fn(
			{ aKey: {anotherKey: 42}},
			{ aKey: {anotherKey: 43}}
		)).to.equal(43);
	});

	it('does not use locals when a 2-part key does not match', function () {
		var fn = parse('aKey.anotherKey');
		expect(fn(
			{ aKey: {anotherKey: 42}},
			{ otherKey: {anotherKey: 43}}
		)).to.equal(42);
	});

	it('uses locals instead of scope when the first part (of a n-part) matches', function () {
		var fn = parse('aKey.anotherKey');
		expect(fn(
			{aKey: {anotherKey: 42}}, 
			{aKey: {}}
		)).to.be.undefined;
	});

	it('uses locals when there is a matching local 4-part key', function () {
		var fn = parse('aKey.key2.key3.key4');
		expect(fn(
			{ aKey: { key2: { key3: { key4: 42}}}},
			{ aKey: { key2: { key3: { key4: 43}}}}
		)).to.equal(43);
	});

	it('uses locals when there is the first part in the local key', function () {
		var fn = parse('aKey.key2.key3.key4');
		expect(fn(
			{ aKey: { key2: { key3: { key4: 42}}}},
			{ aKey: {}}
		)).to.be.undefined;
	});

	it('does not use locals when there is no matching 4-part key', function () {
		var fn = parse('aKey.key2.key3.key4');
		expect(fn(
			{ aKey: { key2: { key3: { key4: 42}}}},
			{ otherKey: { anotherKey: 43}}
		)).to.equal(42);
	});

	it('parses a simple string property access', function () {
		var fn = parse('aKey["anotherKey"]');
		expect(fn({aKey: {anotherKey: 42}})).to.equal(42);
	});

	it('parses a numeric array access', function () {
		var fn = parse('anArray[1]');
		expect(fn({anArray: [1, 2, 3]})).to.equal(2);
	});

	it('parses a property access with another key as property', function () {
		var fn = parse('lock[key]');
		expect(fn(
			{ key: 'theKey', lock: { theKey: 42 }}
		)).to.equal(42);
	});

	it('parses property access with another access as property', function () {
		var fn = parse('lock[keys["aKey"]]');
		expect(fn(
			{ keys: { aKey: 'theKey' }, lock: { theKey: 42 }}
		)).to.equal(42);
	});

	it('parses several field accesses back to back', function () {
		var fn = parse('aKey["anotherKey"]["aThirdKey"]');
		expect(fn(
			{aKey: { anotherKey: {aThirdKey: 42}}}
		)).to.equal(42);
	});

	it('parses a field access after a property access', function () {
		var fn = parse('aKey["anotherKey"].aThirdKey');
		expect(fn(
			{ aKey: { anotherKey: { aThirdKey: 42 }}}
		)).to.equal(42);
	});

	it('parses a chain of property and field accesses', function () {
		var fn = parse('aKey["anotherKey"].aThirdKey["aFourthKey"]');
		expect(fn(
			{ aKey: { anotherKey: { aThirdKey: { aFourthKey: 42 }}}}
		)).to.equal(42);
	});

	it('parses a function call', function () {
		var fn = parse('aFunction()');
		expect(fn(
			{aFunction: function() { return 42; }}
		)).to.equal(42);
	});

	it('parses a function call with a single number argument', function () {
		var fn = parse('aFunction(42)');
		expect(fn(
			{ aFunction: function (n) { return n; }}
		)).to.equal(42);
	});

	it('parses a function call with a single identifier argument', function () {
		var fn = parse('aFunction(n)');
		expect(fn(
			{ n: 42, aFunction: function (arg) { return arg; }}
		)).to.equal(42);
	});

	it('parses a function call with a single function call argument', function () {
		var fn = parse('aFunction(argFn())');
		expect(fn({
			argFn: _.constant(42),
			aFunction: function (arg) { return arg; }
		})).to.equal(42);
	});

	it('parses a function call with multiple arguments', function () {
		var fn = parse('aFunction(37, n, argFn())');
		expect(fn({
			n: 3,
			argFn: _.constant(2),
			aFunction: function (a1, a2, a3) { return a1 + a2 + a3; }
		}));
	});

	it('does not allow calling the function constructor', function () {
		expect(function () {
			var fn = parse('aFunction.constructor("return window;")()');
		}).to.throw;
	});

	it('calls functions accessed as properties with the correct this', function () {
		var scope = {
			anObject: {
				aMember: 42,
				aFunction: function () {
					return this.aMember;
				}
			}
		};

		var fn = parse('anObject["aFunction"]()');
		expect(fn(scope)).to.equal(42);
	});

	it('calls functions accessed as fields with the correct this', function () {
		var scope = {
			anObject: {
				aMember: 42,
				aFunction: function () {
					return this.aMember;
				}
			}
		};

		var fn = parse('anObject.aFunction()');
		expect(fn(scope)).to.equal(42);
	});

	it('calls methods with whitespace before function call', function () {
		var scope = {
			anObject: {
				aMember: 42,
				aFunction: function () {
					return this.aMember;
				}
			}
		};

		var fn = parse('anObject.aFunction    ()');
		expect(fn(scope)).to.equal(42);
	});

	it('clears the this context on function calls', function () {
		var scope = {
			anObject: {
				aMember: 42,
				aFunction: function () {
					return function () {
						this.aMember;
					};
				}
			}
		};

		var fn = parse('anObject.aFunction()()');
		expect(fn(scope)).to.be.undefined;
	});

	it('does not allow accessing window as property', function () {
		var fn = parse('anObject["wnd"]');
		expect(function () { fn({ anObject: { wnd: window }}); }).to.throw;
	});

	it('does not allow calling functions of window', function () {
		var fn = parse('wnd.scroll(500, 0)');
		expect(function () { fn({ wnd: window }); }).to.throw;
	});

	it('does not allow functions to return window', function () {
		var fn = parse('getWnd()');
		expect(function() { fn({getWnd: _.constant(window)}); }).to.throw();
	});

	it('does not allow calling functions on DOM elements', function() {
		var fn = parse('el.setAttribute("evil", "true")');
		expect(function() { fn({el: document.documentElement}); }).to.throw();
	});

	it('does not allow calling the aliased function constructor', function () {
		var fn = parse('fnConstructor("return window")');
		expect(function () {
			fn({ fnConstructor: (function () { }).constructor })
		}).to.throw;
	});

	it('does not allow calling functions on Object', function () {
		var fn = parse('obj.create({})');
		expect(function () {
			fn({ obj: Object});
		}).to.throw;
	});

	it('does not allow calling call', function() {
		var fn = parse('fun.call(obj)');
		expect(function() { fn({fun: function() { }, obj: {}}); }).to.throw;
	});
	it('does not allow calling apply', function() {
		var fn = parse('fun.apply(obj)');
		expect(function() { fn({fun: function() { }, obj: {}}); }).to.throw;
	});
	it('does not allow calling bind', function() {
		var fn = parse('fun.bind(obj)');
		expect(function() { fn({fun: function() { }, obj: {}}); }).to.throw;
	});

	it('parses a simple attribute assignment', function () {
		var fn = parse('anAttribute = 42');
		var scope = {};
		fn(scope);
		expect(scope.anAttribute).to.equal(42);
	});

	it('can assign any primary expression', function() {
		var fn = parse('anAttribute = aFunction()');
		var scope = {aFunction: _.constant(42)};
		fn(scope);
		expect(scope.anAttribute).to.equal(42);
	});

	it('parses a nested attribute assignment', function () {
		var fn = parse('anObject.anAttribute = 42');
		var scope = { anObject: {}};
		fn(scope);
		expect(scope.anObject.anAttribute).to.equal(42);
	});

	it('creates the objects in the setter path that do not exist', function () {
		var fn = parse('some.nested.path = 42');
		var scope = {};
		fn(scope);
		expect(scope.some.nested.path).to.equal(42);
	});

	it('parses an assignment through attribute access', function () {
		var fn = parse('anObject["anAttribute"] = 42');
		var scope = { anObject: {}};
		fn(scope);
		expect(scope.anObject.anAttribute).to.equal(42);
	});

	it('parses assignment through field access after something else', function() {
		var fn = parse('anObject["otherObject"].nested = 42');
		var scope = {anObject: {otherObject: {}}};
		fn(scope);
		expect(scope.anObject.otherObject.nested).to.equal(42);
	});

	it('parses an array with non-literals', function() {
		var fn = parse('[a, b, c()]');
		expect(fn({a: 1, b: 2, c: _.constant(3)})).to.deep.equal([1, 2, 3]);
	});

	it('parses an object with non-literals', function() {
		var fn = parse('{a: a, b: obj.c()}');
		expect(fn({
			a: 1,
			obj: {
				b: _.constant(2),
				c: function() {
					return this.b();
				}
			}
		})).to.deep.equal({a: 1, b: 2});
	});

	it('makes arrays constant when they only contain constants', function() {
		var fn = parse('[1, 2, [3, 4]]');
		expect(fn.constant).to.be.true;
	});

	it('makes arrays non-constant when they contain non-constants', function() {
		expect(parse('[1, 2, a]').constant).to.be.false;
		expect(parse('[1, 2, [[[[[a]]]]]]').constant).to.be.false;
	});

	it('makes objects constant when they only contain constants', function() {
		var fn = parse('{a: 1, b: {c: 3}}');
		expect(fn.constant).to.be.true;
	});

	it('makes objects non-constant when they contain non-constants', function() {
		expect(parse('{a: 1, b: c}').constant).to.be.false;
		expect(parse('{a: 1, b: {c: d}}').constant).to.be.false;
	});

	it('allows an array element to be an assignment', function() {
		var fn = parse('[a = 1]');
		var scope = {};
		expect(fn(scope)).to.deep.equal([1]);
		expect(scope.a).to.equal(1);
	});
	it('allows an object value to be an assignment', function() {
		var fn = parse('{a: b = 1}');
		var scope = {};
		expect(fn(scope)).to.deep.equal({a: 1});
		expect(scope.b).to.equal(1);
	});

	it('parses a unary +', function() {
		expect(parse('+42')()).to.equal(42);
		expect(parse('+a')({a: 42})).to.equal(42);
	});

	it('parses a unary !', function() {
		expect(parse('!true')()).to.be.false;
		expect(parse('!42')()).to.be.false;
		expect(parse('!a')({a: false})).to.be.true;
		expect(parse('!!a')({a: false})).to.be.false;
	});

	it('parses negated value as constant if value is constant', function() {
		expect(parse('!true').constant).to.be.true;
		expect(parse('!!true').constant).to.be.true;
		expect(parse('!a').constant).to.not.be.ok;
	});

	it('parses a unary -', function() {
		expect(parse('-42')()).to.equal(-42);
		expect(parse('-a')({a: -42})).to.equal(42);
		expect(parse('--a')({a: -42})).to.equal(-42);
	});

	it('parses numerically negated value as constant if needed', function() {
		expect(parse('-42').constant).to.be.true;
		expect(parse('-a').constant).to.not.be.ok;
	});

	it('fills missing value in unary - with zero', function() {
		expect(parse('-a')()).to.equal(0);
	});

	it('parses a multiplication', function() {
		expect(parse('21 * 2')()).to.equal(42);
	});

	it('parses a division', function() {
		expect(parse('84 / 2')()).to.equal(42);
	});

	it('parses a remainder', function() {
		expect(parse('85 % 43')()).to.equal(42);
	});

	it('parses several multiplicatives', function() {
		expect(parse('36 * 2 % 5')()).to.equal(2);
	});

	it('parses an addition', function() {
		expect(parse('20 + 22')()).to.equal(42);
	});

	it('parses a subtraction', function() {
		expect(parse('42 - 22')()).to.equal(20);
	});

	it('parses multiplicatives on a higher precedence than additives', function() {
		expect(parse('2 + 3 * 5')()).to.equal(17);
		expect(parse('2 + 3 * 2 + 3')()).to.equal(11);
	});

	it('treats a missing subtraction operand as zero', function() {
		expect(parse('a - b')({a: 20})).to.equal(20);
		expect(parse('a - b')({b: 20})).to.equal(-20);
		expect(parse('a - b')({})).to.equal(0);
	});

	it('treats a missing addition operand as zero', function() {
		expect(parse('a + b')({a: 20})).to.equal(20);
		expect(parse('a + b')({b: 20})).to.equal(20);
	});

	it('returns undefined from addition when both operands missing', function() {
		expect(parse('a + b')()).to.be.undefined;
	});

	it('parses relational operators', function() {
		expect(parse('1 < 2')()).to.be.true;
		expect(parse('1 > 2')()).to.be.false;
		expect(parse('1 <= 2')()).to.be.true;
		expect(parse('2 <= 2')()).to.be.true;
		expect(parse('1 >= 2')()).to.be.false;
		expect(parse('2 >= 2')()).to.be.true;
	});

	it('parses equality operators', function() {
		expect(parse('42 == 42')()).to.be.true;
		expect(parse('42 == "42"')()).to.be.true;
		expect(parse('42 != 42')()).to.be.false;
		expect(parse('42 === 42')()).to.be.true;
		expect(parse('42 === "42"')()).to.be.false;
		expect(parse('42 !== 42')()).to.be.false;
	});

	it('parses relationals on a higher precedence than equality', function() {
		expect(parse('2 == "2" > 2 === "2"')()).to.be.false;
	});

	it('parses additives on a higher precedence than relationals', function() {
		expect(parse('2 + 3 < 6 - 2')()).to.be.false;
	});

	it('parses logical AND', function() {
		expect(parse('true && true')()).to.be.true;
		expect(parse('true && false')()).to.be.false;
	});

	it('parses logical OR', function() {
		expect(parse('true || true')()).to.be.true;
		expect(parse('true || false')()).to.be.true;
		expect(parse('fales || false')()).to.be.false;
	});

	it('parses multiple ANDs', function() {
		expect(parse('true && true && true')()).to.be.true;
		expect(parse('true && true && false')()).to.be.false;
	});

	it('parses multiple ORs', function() {
		expect(parse('true || true || true')()).to.be.true;
		expect(parse('true || true || false')()).to.be.true;
		expect(parse('false || false || true')()).to.be.true;
		expect(parse('false || false || false')()).to.be.false;
	});

	it('short-circuits AND', function() {
		var invoked;
		var scope = {fn: function() { invoked = true; }};
		parse('false && fn()')(scope);
		expect(invoked).to.be.undefined;
	});

	it('short-circuits OR', function() {
		var invoked;
		var scope = {fn: function() { invoked = true; }};
		parse('true || fn()')(scope);
		expect(invoked).to.be.undefined;
	});

	it('parses AND with a higher precedence than OR', function() {
		expect(parse('false && true || true')()).to.be.true;
	});

	it('parses OR with a lower precedence than equality', function() {
		expect(parse('1 === 2 || 2 === 2')()).to.be.ok;
	});

	it('parses the ternary expression', function() {
		expect(parse('a === 42 ? true : false')({a: 42})).to.be.true;
		expect(parse('a === 42 ? true : false')({a: 43})).to.be.false;
	});

	it('parses OR with a higher precedence than ternary', function() {
		expect(parse('0 || 1 ? 0 || 2 : 0 || 3')()).to.equal(2);
	});

	it('parses nested ternaries', function() {
	expect(
		parse('a === 42 ? b === 42 ? "a and b" : "a" : c === 42 ? "c" : "none"')({
			a: 44,
			b: 43,
			c: 42
		})).to.equal('c');
	});

	it('makes ternaries constants if their operands are', function() {
		expect(parse('true ? 42 : 43').constant).to.be.ok;
		expect(parse('true ? 42 : a').constant).to.not.be.ok;
	});

	it('parses parentheses altering precedence order', function() {
		expect(parse('21 * (3 - 1)')()).to.equal(42);
		expect(parse('false && (true || true)')()).to.be.false;
		expect(parse('-((a % 2) === 0 ? 1 : 2)')({a: 42})).to.equal(-1);
	});

	it('parses several statements', function() {
		var fn = parse('a = 1; b = 2; c = 3');
		var scope = {};
		fn(scope);
		expect(scope).to.deep.equal({a: 1, b: 2, c: 3});
	});

	it('returns the value of the last statement', function() {
		expect(parse('a = 1; b = 2; a + b')({})).to.equal(3);
	});

	it('does not allow accessing __proto__', function () {
		expect(function () {
			var fn = parse('obj.__proto__');
			fn({ obj: {}});
		}).to.throw;
	});

	it('does not allow calling __defineGetter__', function () {
		expect(function () {
			var fn = parse('obj.__defineGetter__("evil", fn)');
			fn({ obj: {}, fn: function () {} });
		}).to.throw;
	});

	it('does not allow calling __defineSetter__', function () {
		expect(function () {
			var fn = parse('obj.__defineSetter__("evil", fn)');
			fn({ obj: {}, fn: function () {} });
		}).to.throw;
	});

	it('does not allow calling __lookupGetter__', function () {
		expect(function () {
			var fn = parse('obj.__defineSetter__("evil")');
			fn({ obj: {}, fn: function () {} });
		}).to.throw;
	});

	it('does not allow calling __lookupSetter__', function () {
		expect(function () {
			var fn = parse('obj.__lookupSetter__("evil")');
			fn({ obj: {}, fn: function () {} });
		}).to.throw;
	});
});