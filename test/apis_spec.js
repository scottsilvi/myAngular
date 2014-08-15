var apis = require('../src/apis');
var hashKey = apis.hashKey;
var HashMap = apis.HashMap;
var _ = require('lodash');

describe('apis', function () {
	'use strict';

	describe('hashKey', function () {
		it('is undefined:undefined for undefined', function () {
			expect(hashKey(undefined)).to.equal('undefined:undefined');
		});

		it('is object:null for null', function () {
			expect(hashKey(null)).to.equal('object:null');
		});

		it('is boolean:true for true', function () {
			expect(hashKey(true)).to.equal('boolean:true');
		});

		it('is boolean:false for true', function () {
			expect(hashKey(false)).to.equal('boolean:false');
		});

		it('is number:42 for 42', function() {
			expect(hashKey(42)).to.equal('number:42');
		});

		it('is string:42 for "42"', function () {
			expect(hashKey('42')).to.equal('string:42');
		});

		it('is function:[unique id] for functions', function () {
			var fn = function (a) { return a; };
			expect(hashKey(fn)).to.match(/^function:\S+$/);
		});

		it('is the same key when asked for the same function many times', function() {
			var fn = function() { };
			expect(hashKey(fn)).to.equal(hashKey(fn));
		});

		it('is not the same for different identical functions', function() {
			var fn1 = function() { return 42; };
			var fn2 = function() { return 42; };
			expect(hashKey(fn1)).to.not.equal(hashKey(fn2));
		});

		it('is object:[unique id] for objects', function () {
			expect(hashKey({})).to.match(/^object:\S+$/);
		});

		it('is the same key when asked for the same object many times', function () {
			var obj = {};
			expect(hashKey(obj)).to.equal(hashKey(obj));
		});

		it('does not change when object value changes', function () {
			var obj = { a: 42 };
			var hash1 = hashKey(obj);
			obj.a = 43;
			var hash2 = hashKey(obj);
			expect(hash1).to.equal(hash2);
		});

		it('is not the same for different objects even with the same value', function () {
			var obj1 = { a : 42 };
			var obj2 = { a : 42 };
			expect(hashKey(obj1)).to.not.equal(hashKey(obj2));
		});

		it('stores the hash key in the $$hashKey attribute', function () {
			var obj = { a : 42 };
			var hash = hashKey(obj);
			expect(obj.$$hashKey).to.equal(hash.match(/^object:(\S+)$/)[1]);
		});

		it('uses preassigned $$hashKey', function () {
			expect(hashKey({$$hashKey: 42 })).to.equal('object:42');
		});

		it('supports a function $$hashKey', function() {
			expect(hashKey({$$hashKey: _.constant(42)})).to.equal('object:42');
		});

		it('calls the function $$hashKey as a method with the correct this', function() {
			expect(hashKey({
				myKey: 42,
				$$hashKey: function() {
					return this.myKey;
				}
			})).to.equal('object:42');
		});
	});

	describe('hashMap', function () {

		it('supports put and get of primatives', function () {
			var map = new HashMap();
			map.put(42, 'fourty two');
			expect(map.get(42)).to.equal('fourty two');
		});

		it('supports put and get objects with hashKey semantics', function () {
			var map = new HashMap();
			var obj = {};
			map.put(obj, 'my value');
			expect(map.get(obj)).to.equal('my value');
			expect(map.get({})).to.be.undefined;
		});

		it('supports remove', function () {
			var map = new HashMap();
			map.put(42, 'fourty two');
			map.remove(42);
			expect(map.get(42)).to.be.undefined;
		});

		it('returns value from remove', function () {
			var map = new HashMap();
			map.put(42, 'fourty two');
			expect(map.remove(42)).to.equal('fourty two');
		});
	});
});