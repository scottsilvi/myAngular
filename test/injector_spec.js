/* jshint globalstrict: true */
/* global createInjector: false, setupModuleLoader: false, angular: false */
'use strict';

var setupModuleLoader = require('../src/loader');
var createInjector = require('../src/injector');
var _ = require('lodash');

describe('injector', function () {

	beforeEach(function () {
		delete window.angular;
		setupModuleLoader(window);
	});

	it('can be created', function () {
		var injector = createInjector([]);
		expect(injector).to.be.defined;
	});

	it('has a constant that has been registered to a module', function () {
		var module = angular.module('myModule', []);
		module.constant('aConstant', 42);
		var injector = createInjector(['myModule']);
		expect(injector.has('aConstant')).to.be.true;
	});

	it('does not have a non-registered constant', function () {
		var module = angular.module('myModule', []);
		var injector = createInjector(['myModule']);
		expect(injector.has('aConstant')).to.be.false;
	});

	it('does not allow a constant called hasOwnProperty', function () {
		var module = angular.module('myModule', []);
		module.constant('hasOwnProperty', _.constant(false));
		expect(function () {
			createInjector(['myModule']);
		}).to.throw;
	});

	it('can return a registered constant', function () {
		var module = angular.module('myModule', []);
		module.constant('aConstant', 42);
		var injector = createInjector(['myModule']);
		expect(injector.get('aConstant')).to.equal(42);
	});

	it('loads multiple modules', function () {
		var module1 = angular.module('myModule', []);
		var module2 = angular.module('myOtherModule', []);
		module1.constant('aConstant', 42);
		module2.constant('anotherConstant', 43);
		var injector = createInjector(['myModule', 'myOtherModule']);

		expect(injector.has('aConstant')).to.be.true;
		expect(injector.has('anotherConstant')).to.be.true;
	});

	it('loads the required modules of a module', function () {
		var module1 = angular.module('myModule', []);
		var module2 = angular.module('myOtherModule', ['myModule']);
		module1.constant('aConstant', 42);
		module2.constant('anotherConstant', 43);
		var injector = createInjector(['myOtherModule']);

		expect(injector.has('aConstant')).to.be.true;
		expect(injector.has('anotherConstant')).to.be.true;
	});

	it('loads the transitively required modules of a module', function () {
		var module1 = angular.module('myModule', []);
		var module2 = angular.module('myOtherModule', ['myModule']);
		var module3 = angular.module('myThirdModule', ['myOtherModule']);
		module1.constant('aConstant', 42);
		module2.constant('anotherConstant', 43);
		module2.constant('aThirdConstant', 44);
		var injector = createInjector(['myThirdModule']);

		expect(injector.has('aConstant')).to.be.true;
		expect(injector.has('anotherConstant')).to.be.true;
		expect(injector.has('aThirdConstant')).to.be.true;
	});

	it('loads each module only once', function () {
		var module1 = angular.module('myModule', ['myOtherModule']);
		var module2 = angular.module('myOtherModule', ['myModule']);

		createInjector(['myModule']);
	});

	it('invokes an annotated function with dependency injection', function () {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);

		var fn = function (one, two) { return one + two; };
		fn.$inject = ['a', 'b'];

		expect(injector.invoke(fn)).to.equal(3);
	});

	it('does not accept non-strings as injection tokens', function () {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		var injector = createInjector(['myModule']);

		var fn = function (one, two) { return one + two; };
		fn.$inject = ['a', 2];

		expect(function () {
			injector.invoke(fn);
		}).to.throw;
	});

	it('invokes a function with the given this context', function () {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		var injector = createInjector(['myModule']);

		var obj = {
			two: 2,
			fn: function (one) { return one + this.two; }
		};
		obj.fn.$inject = ['a'];

		expect(injector.invoke(obj.fn, obj)).to.equal(3);
	});

	it('overrides dependencies with locals when invoking', function () {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);

		var fn = function (one, two) { return one + two; };
		fn.$inject = ['a', 'b'];

		expect(injector.invoke(fn, undefined, { b: 3 })).to.equal(4);
	});

	describe('annotate', function () {

		it('returns the $inject annotation of a function when it has one', function () {
			var injector = createInjector([]);

			var fn = function () {};
			fn.$inject = ['a', 'b'];

			expect(injector.annotate(fn)).to.deep.equal(['a', 'b']);
		});

		it('returns the array-style annotations of a function', function () {
			var injector = createInjector([]);

			var fn = ['a', 'b', function () {}];

			expect(injector.annotate(fn)).to.deep.equal(['a','b']);
		});

		it('returns an empty array for a non-annotated 0-arg function', function () {
			var injector = createInjector([]);

			var fn = function () {};

			expect(injector.annotate(fn)).to.deep.equal([]);
		});

		it('returns annotations parsed from function args when not annotated', function () {
			var injector = createInjector([]);

			var fn = function (a, b) {};

			expect(injector.annotate(fn)).to.deep.equal(['a', 'b']);
		});

		it('strips comments from argument lists when parsing', function() {
			var injector = createInjector([]);
			
			var fn = function(a, /*b,*/ c) { };
		
			expect(injector.annotate(fn)).to.deep.equal(['a', 'c']);
		});

		it('strips out several comments from argument lists when parsing', function() {
			var injector = createInjector([]);
			
			var fn = function(a, /*b,*/ c/*, d*/) { };
		
			expect(injector.annotate(fn)).to.deep.equal(['a', 'c']);
		});

		it('strips // comments from argument lists when parsing', function() {
			var injector = createInjector([]);
			
			var fn = function(a, //b,
			
			c) { };
			
			expect(injector.annotate(fn)).to.deep.equal(['a', 'c']);
		});

		it('strips surrounding underscores from argument names when parsing', function() {
			var injector = createInjector([]);
			
			var fn = function(a, _b_, c_, _d, an_argument) { };
			
			expect(injector.annotate(fn)).to.deep.equal(['a', 'b', 'c_', '_d', 'an_argument']);
		});
	});

	it('invokes an array-annotated function with dependency injection', function() {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
	
		var fn = ['a', 'b', function(one, two) { return one + two; }];
	
		expect(injector.invoke(fn)).to.equal(3);
	});

	it('invokes a non-annotated function with dependency injection', function() {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
		
		var fn = function(a, b) { return a + b; };
		
		expect(injector.invoke(fn)).to.equal(3);
	});

	it('instantiates an annotated constructor function', function () {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);

		function Type (one, two) {
			this.result = one + two;
		};

		Type.$inject = ['a', 'b'];

		var instance = injector.instantiate(Type);
		expect(instance.result).to.equal(3);
	});

	it('instantiates an array-annotated constructor function', function() {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
		
		function Type (one, two) {
			this.result = one + two;
		};

		var instance = injector.instantiate(['a', 'b', Type]);
		
		expect(instance.result).to.equal(3);
	});

	it('instantiates a non-annotated constructor function', function() {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
		
		function Type(a, b) {
			this.result = a + b;
		};

		var instance = injector.instantiate(Type);

		expect(instance.result).to.equal(3);
	});

	it('uses the prototype of the constructor when instantiating', function() {
		function BaseType() { }
		BaseType.prototype.getValue = _.constant(42);
		
		function Type() { this.v = this.getValue(); }
		Type.prototype = BaseType.prototype;
		
		var module = angular.module('myModule', []);
		var injector = createInjector(['myModule']);
		
		var instance = injector.instantiate(Type);
		expect(instance.v).to.equal(42);
	});

	it('supports locals when instantiating', function() {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
		
		function Type(a, b) {
			this.result = a + b;
		}
		
		var instance = injector.instantiate(Type, {b: 3});
		
		expect(instance.result).to.equal(4);
	});

	it('allows registering a provider and uses its $get', function () {
		var module = angular.module('myModule', []);
		module.provider('a', {
			$get: function () {
				return 42;
			}
		});

		var injector = createInjector(['myModule']);

		expect(injector.has('a')).to.be.true;
		expect(injector.get('a')).to.equal(42);
	});

	it('injects the $get method of a provider', function () {
		var module = angular.module('myModule', []);
		module.constant('a', 1);
		module.provider('b', {
			$get: function (a) {
				return a + 2;
			}
		});

		var injector = createInjector(['myModule']);

		expect(injector.get('b')).to.equal(3);
	});

	it('injects the $get method of a provider lazily', function () {
		var module = angular.module('myModule', []);
		module.provider('b', {
			$get: function (a) {
				return a + 2;
			}
		});
		module.provider('a', { $get: _.constant(1) });
		
		var injector = createInjector(['myModule']);

		expect(injector.get('b')).to.equal(3);
	});

	it('instantiates a dependency only once', function () {
		var module = angular.module('myModule', []);
		module.provider('a', { $get: function () { return {}; } });
		
		var injector = createInjector(['myModule']);
		expect(injector.get('a')).to.equal(injector.get('a'));
	});

	it('notifies the user about a circular dependency', function() {
		var module = angular.module('myModule', []);
		module.provider('a', {$get: function(b) { }});
		module.provider('b', {$get: function(c) { }});
		module.provider('c', {$get: function(a) { }});
		
		var injector = createInjector(['myModule']);
		
		expect(function() {
			injector.get('a');
		}).to.throw('Circular dependency found');
	});

	it('cleans up the circular marker when instantiation fails', function () {
		var module = angular.module('myModule', []);
		module.provider('a', { $get: function () { 
			throw 'Failing instantiation!';
		}});

		var injector = createInjector(['myModule']);

		expect(function () {
			injector.get('a');
		}).to.throw('Failing instantiation!');

		expect(function () {
			injector.get('a');
		}).to.throw('Failing instantiation!');
	});

	it('notifies the user about a circular dependency', function () {
		var module = angular.module('myModule', []);
		module.provider('a', {$get: function(b) { }});
		module.provider('b', {$get: function(c) { }});
		module.provider('c', {$get: function(a) { }});

		var injector = createInjector(['myModule']);
		
		expect(function() {
			injector.get('a');
		}).to.throw('Circular dependency found: c <- b <- a');
	});

	it('instantiates a provider if given as a constructor function', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider () {
			this.$get = function () { return 42; }
		});

		var injector = createInjector(['myModule']);

		expect(injector.get('a')).to.equal(42);
	});

	it('injects the given provider constructor function', function () {
		var module = angular.module('myModule', []);

		module.constant('b', 2);
		module.provider('a', function AProvider (b) {
			this.$get = function () { return 1 + b; }
		});

		var injector = createInjector(['myModule']);

		expect(injector.get('a')).to.equal(3);
	});

	it('injects another provider to a provider constructor function', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider () {
			var value = 1;
			this.setValue = function (v) { value = v; };
			this.$get = function () { return value; }
		});

		module.provider('b', function BProvider (aProvider) {
			aProvider.setValue(2);
			this.$get = function () {};
		});

		var injector = createInjector(['myModule']);

		expect(injector.get('a')).to.equal(2);
	});

	it('does not inject an instance to a provider constructor function', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider () {
			this.$get = function () { return 1; }
		});

		module.provider('b', function BProvider (a) {
			this.$get = function () { return a; }
		});

		expect(function () {
			createInjector(['myModule']);
		}).to.throw;
	});	

	it('does not inject a provider to a $get function', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider () {
			this.$get = function () { return 1; }
		});

		module.provider('b', function BProvider () {
			this.$get = function (aProvider) { return aProvider.$get(); }
		});
		
		var injector = createInjector(['myModule']);

		expect(function () {
			injector.get('b');
		}).to.throw;
	});

	it('does not inject a provider to invoke', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider () {
			this.$get = function () { return 1; }
		});
		
		var injector = createInjector(['myModule']);

		expect(function () {
			injector.invoke(function (aProvider) {});
		}).to.throw;
	});

	it('does not give access to providers through get', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider () {
			this.$get = function () { return 1; }
		});

		var injector = createInjector(['myModule']);

		expect(function () {
			injector.get('aProvider');
		}).to.throw;
	});

	it('registers constants first to make them available to providers', function () {
		var module = angular.module('myModule', []);

		module.provider('a', function AProvider (b) {
			this.$get = function () { return b; };
		});
		module.constant('b', 42);

		var injector = createInjector(['myModule']);

		expect(injector.get('a')).to.equal(42);
	});
});
