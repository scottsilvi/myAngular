/* jshint globalstrict:true */
/* global Scope: false */
'use strict';

var Scope = require('../src/scope');
var Angular = require('../src/myAngular');
var createInjector = require('../src/injector');
var publishExternalAPI = require('../src/angular_public');
var _ = require('lodash');
var assert = require('assert');

describe('Scope', function () {

	describe('digest', function () {

		var scope;

		beforeEach(function () {
			publishExternalAPI();
			scope = createInjector(['ng']).get('$rootScope');
		});

		it('calls the listener function of a watch on first $digest', function () {
			var watchFn = function () { return 'wat'; };
			var listenerFn = sinon.spy();
			scope.$watch(watchFn, listenerFn);

			scope.$digest();
			expect(listenerFn.called);
		});
		it('calls the watch function with the scope as the argument', function() {
			var watchFn = sinon.spy();
			var listenerFn = function() { };
			scope.$watch(watchFn, listenerFn);
			scope.$digest();
			assert(watchFn.calledWith(scope));
		});

		it('calls the listener function when the watched value changes', function () {
			scope.someValue = 'a';
			scope.counter = 0;

			scope.$watch(
				function(scope) { return scope.someValue },
				function(newValue, oldValue, scope) { scope.counter++ }
			);

			expect(scope.counter).to.equal(0);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.someValue = 'b';
			expect(scope.counter).to.equal(1);

			scope.$digest();
			expect(scope.counter).to.equal(2);

		});

		it('calls listener when watch value is first undefined', function () {
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.someValue; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('calls listener with new value as old value the first time', function () {
			scope.someValue = 123;
			var oldValueGiven;

			scope.$watch(
				function (scope) { return scope.someValue; },
				function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
			);

			scope.$digest();
			expect(oldValueGiven).to.equal(123);
		});

		it('may have watchers that omit the listener function', function () {
			var watchFn = sinon.stub().returns('something');
			scope.$watch(watchFn);

			scope.$digest();

			expect(watchFn.called);
		});

		it('triggers chained watchers in the same digest', function () {
			scope.name = 'Jane';

			scope.$watch(
				function (scope) { return scope.nameUpper; },
				function (newValue, oldValue, scope) {
					if(newValue) {
						scope.initial = newValue.substring(0, 1) + '.';
					}
				}
			);

			scope.$watch(
				function (scope) { return scope.name; },
				function (newValue, oldValue, scope) {
					if(newValue) {
						scope.nameUpper = newValue.toUpperCase();
					}
				}
			);

			scope.$digest();
			expect(scope.initial).to.equal('J.');

			scope.name = 'Bob';
			scope.$digest();
			expect(scope.initial).to.equal('B.');
		});

		it('gives up on the watches after 10 iterations', function () {
			scope.counterA = 0;
			scope.counterB = 0;

			scope.$watch(
				function (scope) { return scope.counterA; },
				function (newValue, oldValue, scope) {
					scope.counterB++;
				}
			);

			scope.$watch(
				function (scope) { return scope.counterB; },
				function (newValue, oldValue, scope) {
					scope.counterA++;
				}
			);
			expect((function() { scope.$digest(); })).to.throw();
		});

		it('ends the digest when the last watch is clean', function () {
			scope.array = _.range(100);
			var watchExecutions = 0;

			_.times(100, function (i) {
				scope.$watch(
					function (scope) {
						watchExecutions++;
						return scope.array[i];
					},
					function (newValue, oldValue, scope) {}
				);
			});

			scope.$digest();
			expect(watchExecutions).to.equal(200);

			scope.array[0] = 420;
			scope.$digest();
			expect(watchExecutions).to.equal(301);
		});

		it('does not end digest so that new watchers are not run', function () {
			scope.aValue = 'abc';
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.$watch(
						function (scope) { return scope.aValue; },
						function (newValue, oldValue, scope) {
							scope.counter++;
						}
					);
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('compares based on value if enabled', function () {
			scope.aValue = [1, 2, 3];
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				},
				true
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.aValue.push(4);
			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('correctly handles NaNs', function () {
			scope.number = 0/0; //NaN
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.number; },
				function (newValue, oldValue, scope) { 
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('executes $eval\'ed function and returns result', function () {
			scope.aValue = 42;

			var result = scope.$eval(function(scope) {
				return scope.aValue;
			});

			expect(result).to.equal(42);
		});

		it('passes the second $eval argument straight through', function () {
			scope.aValue = 42;

			var result = scope.$eval(function(scope, arg) {
				return scope.aValue + arg;
			}, 2);

			expect(result).to.equal(44);
		});

		it('executes $apply\'ed function and starts the digest', function () {
			scope.aValue = 'someValue';
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.$apply(function (scope) {
				scope.aValue = 'someOtherValue';
			});
			expect(scope.counter).to.equal(2);
		});

		it('executes $evalAsynced function later in the same cycle', function () {
			scope.aValue = [1 ,2, 3];
			scope.asyncEvaluated = false;
			scope.asyncEvaluatedImmediately = false;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) { 
					scope.$evalAsync(function (scope) {
						scope.asyncEvaluated = true;
					});
					scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
				}
			);

			scope.$digest();
			expect(scope.asyncEvaluated).to.be.true;
			expect(scope.asyncEvaluatedImmediately).to.be.false;
		});

		it('executes $evalAsyncd functions added by watch functions', function () {
			scope.aValue = [1, 2, 3];
			scope.asyncEvaluated = false;

			scope.$watch(
				function (scope) { 
					if(!scope.asyncEvaluated) {
						scope.$evalAsync(function (scope) {
							scope.asyncEvaluated = true;
						});
					}
					return scope.aValue; 
				},
				function (newValue, oldValue, scope) {}
			);

			scope.$digest();
			expect(scope.asyncEvaluated).to.be.true;
		});

		it('executes $evalAsynced functions even when not dirty', function () {
			scope.aValue = [1, 2, 3];
			scope.asyncEvaluatedTimes = 0;

			scope.$watch(
				function (scope) { 
					if (scope.asyncEvaluatedTimes < 2) {
						scope.$evalAsync(function (scope) {
							scope.asyncEvaluatedTimes++;
						});
					}
					return scope.aValue;
				},
				function (newValue, oldValue, scope) {}
			);

			scope.$digest();
			expect(scope.asyncEvaluatedTimes).to.equal(2);
		});

		it('eventually halts $evalAsyncs added by watches', function () {
			scope.aValue = [1, 2, 3];

			scope.$watch(
				function (scope) {
					scope.$evalAsync(function (scope) {});
					return scope.aValue;
				},
				function (newValue, oldValue, scope) {}
			);

			expect(function () { scope.$digest() }).to.throw();
		});

		it('has a $$phase field whose value is the current digest phase', function () {
			scope.aValue = [1, 2, 3];
			scope.phaseInWatchFunction = undefined;
			scope.phaseInListenerFunction = undefined;
			scope.phaseInApplyFunction = undefined;

			scope.$watch(
				function (scope) {
					scope.phaseInWatchFunction = scope.$$phase;
					return scope.aValue;
				},
				function (newValue, oldValue, scope) {
					scope.phaseInListenerFunction = scope.$$phase;
				}
			);

			scope.$apply(function (scope) {
				scope.phaseInApplyFunction = scope.$$phase;
			});

			expect(scope.phaseInWatchFunction).to.equal('$digest');
			expect(scope.phaseInListenerFunction).to.equal('$digest');
			expect(scope.phaseInApplyFunction).to.equal('$apply');
		});

		it('schedules a digest in $evalAsync', function (done) {
			scope.aValue = 'abc';
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$evalAsync(function (scope) {});

			expect(scope.counter).to.equal(0);
			setTimeout(function () {
				expect(scope.counter).to.equal(1);
				done();
			}, 50);
		});

		it('runs a $$postDigest function after each digest', function () {
			scope.counter = 0;

			scope.$$postDigest(function () {
				scope.counter++;
			});

			expect(scope.counter).to.equal(0);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('does not include $$postDigest in the digest', function () {
			scope.aValue = 'original value';

			scope.$$postDigest(function () {
				scope.aValue = 'changed value';
			});

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.watchedValue = newValue;
				}
			);

			scope.$digest();
			expect(scope.watchedValue).to.equal('original value');

			scope.$digest();
			expect(scope.watchedValue).to.equal('changed value');
		});

		it('catches exceptions in watch functions and continues', function () {
			scope.aValue = 'abc';
			scope.counter = 0;

			scope.$watch(
				function (scope) { throw 'error'; },
				function (newValue, oldValue, scope) {}
			);

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('catches exceptions in listener functions and continues', function () {
			scope.aValue = 'abc';
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					throw 'Error';
				}
			);

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('catches exceptions in $evalAsync', function (done) {
			scope.aValue = 'abc';
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$evalAsync(function () {
				throw 'Error';
			});

			setTimeout(function () {
				expect(scope.counter).to.equal(1);
				done();
			}, 50);
		});

		it('catches exceptions in $$postDigest', function () {
			var didRun = false;

			scope.$$postDigest(function () {
				throw 'Error';
			});
			scope.$$postDigest(function () {
				didRun = true;
			});

			scope.$digest();
			expect(didRun).to.be.true;
		});

		it('allows destroying a $watch with a removal function', function () {
			scope.aValue = 'abc';
			scope.counter = 0;

			var destroyWatch = scope.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.aValue = 'def';
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.aValue = 'geh';
			destroyWatch();
			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('allows destroying a $watch during digest', function () {
			scope.aValue = 'abc';

			var watchCalls = [];

			scope.$watch(
				function (scope) {
					watchCalls.push('first');
					return scope.aValue;
				}
			);

			var destroyWatch = scope.$watch(
				function (scope) {
					watchCalls.push('second');
					destroyWatch();
				}
			);

			scope.$watch(
				function (scope) {
					watchCalls.push('third');
					return scope.aValue;
				}
			);

			scope.$digest();
			expect(watchCalls).to.deep.equal(['first', 'second', 'third', 'first', 'third']);
		});

		it('allows a $watch to destroy another during digest', function () {
			scope.aValue = 'abc';
			scope.counter = 0;

			scope.$watch(
				function (scope) {
					return scope.aValue;
				},
				function (newValue, oldValue, scope) {
					destroyWatch();
				}
			);

			var destroyWatch = scope.$watch(
				function (scope) {},
				function (newValue, oldValue, scope) {}
			);

			scope.$watch(
				function (scope) {
					return scope.aValue;
				},
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('allows destroying several $watches during digest', function () {
			scope.aValue = 'abc';
			scope.counter = 0;

			var destroyWatch1 = scope.$watch(
				function (scope) {
					destroyWatch1();
					destroyWatch2();
				}
			);

			var destroyWatch2 = scope.$watch(
				function (scope) {
					return scope.aValue;
				},
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(0);
		});
	
		it('accepts expressions for watch functions', function () {
			var theValue;

			scope.$watch('42', function (newValue, oldValue, scope) {
				theValue = newValue;
			});
			scope.$digest();

			expect(theValue).to.equal(42);
		});

		it('removes constant watches after first invocation', function () {
			scope.$watch('42', function () {});
			scope.$digest();

			expect(scope.$$watchers.length).to.equal(0);
		});

		it('accepts expressions for listener functions', function () {
			scope.$watch('42', '"forty-two"');
			scope.$digest();
		});

		it('accepts expressions in $apply', function () {
			expect(scope.$eval('42')).to.equal(42);
		});

		it('accepts expressions in $eval', function () {
			expect(scope.$apply('42')).to.equal(42);
		});

		it('accepts expressions in $evalAsync', function (done) {
			scope.$evalAsync('42');
			scope.$$postDigest(done);
		});

	});

	describe('inheritance', function () {

		var parent;

		beforeEach(function () {
			publishExternalAPI();
			parent = createInjector(['ng']).get('$rootScope');
		});

		it('inherits the parent\'s properties', function () {
			parent.aValue = [1, 2, 3];

			var child = parent.$new();

			expect(child.aValue).to.deep.equal([1, 2, 3]);
		});

		it('does not cause a parent to inherit its properties', function () {
			var child = parent.$new();
			child.aValue = [1, 2, 3];

			expect(parent.aValue).to.be.undefined;
		});

		it('inherits the parent\'s properties whenever they are defined', function () {
			var child = parent.$new();

			parent.aValue = [1, 2, 3];

			expect(child.aValue).to.deep.equal([1, 2, 3]);
		});

		it('can manipulate a parent scopes property', function () {
			var child = parent.$new();
			parent.aValue = [1, 2, 3];

			child.aValue.push(4);

			expect(child.aValue).to.deep.equal([1, 2, 3, 4]);
			expect(parent.aValue).to.deep.equal([1, 2, 3, 4]);
		});

		it('can watch a property in the parent', function () {
			var child = parent.$new();
			parent.aValue = [1, 2, 3];
			child.counter = 0;

			child.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				},
				true
			);

			child.$digest();
			expect(child.counter).to.equal(1);

			parent.aValue.push(4);
			child.$digest();
			expect(child.counter).to.equal(2);
		});

		it('can be nested at any depth', function () {
			var a = parent;
			var aa = a.$new();
			var aaa = aa.$new();
			var aab = aaa.$new();
			var ab = aab.$new();
			var abb = ab.$new();

			a.value = 1;

			expect(aa.value).to.equal(1);
			expect(aaa.value).to.equal(1);
			expect(aab.value).to.equal(1);
			expect(ab.value).to.equal(1);
			expect(abb.value).to.equal(1);

			ab.anotherValue = 2;

			expect(abb.anotherValue).to.equal(2);
			expect(aa.anotherValue).to.be.undefined;
			expect(aaa.anotherValue).to.be.undefined;
		});

		it('shadows a parent\'s property with the same name', function () {
			var child = parent.$new();
			
			parent.name = 'Joe';
			child.name = 'Jill';

			expect(child.name).to.equal('Jill');
			expect(parent.name).to.equal('Joe');
		});

		it('does not shadow members of parent scopes attributes', function () {
			var child = parent.$new();

			parent.user = { name: 'Joe' };
			child.user.name = 'Jill';

			expect(child.user.name).to.equal('Jill');
			expect(parent.user.name).to.equal('Jill');
		});

		it('does not digest its parents', function () {
			var child = parent.$new();

			parent.aValue = 'abc';
			parent.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.aValueWas = newValue;
				}
			);

			child.$digest();
			expect(child.aValueWas).to.be.undefined;
		});

		it('keeps a record of its children', function () {
			var child1 = parent.$new();
			var child2 = parent.$new();
			var child2_1 = child2.$new();

			expect(parent.$$children.length).to.equal(2);
			expect(parent.$$children[0]).to.equal(child1);
			expect(parent.$$children[1]).to.equal(child2);

			expect(child1.$$children.length).to.equal(0);
			expect(child2.$$children.length).to.equal(1);
			expect(child2.$$children[0]).to.equal(child2_1);
		});

		it('digests its children', function () {
			var child = parent.$new();

			parent.aValue = 'abc';
			child.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.aValueWas = newValue;
				}
			);

			parent.$digest();
			expect(child.aValueWas).to.equal('abc');
		});

		it('digests from $root on $apply', function () {
			var child = parent.$new();
			var child2 = child.$new();

			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			child2.$apply(function (scope) {});

			expect(parent.counter).to.equal(1);
		});

		it('schedules a digest from root on $evalAsync', function (done) {
			var child = parent.$new();
			var child2 = child.$new();

			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			child2.$evalAsync(function (scope) {});

			setTimeout(function () {
				expect(parent.counter).to.equal(1);
				done();
			}, 50);
		});

		it('does not have access to parent attributes when isolated', function () {
			var child = parent.$new(true);

			parent.aValue = 'abc';

			expect(child.aValue).to.be.undefined;
		});

		it('cannot watch parent attributes when isolated', function () {
			var child = parent.$new(true);

			parent.aValue = 'abc';

			child.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.aValueWas = newValue;
				}
			);

			child.$digest(0);
			expect(child.aValueWas).to.be.undefined;

		});

		it('digests its isolated children', function () {
			var child = parent.$new(true);

			child.aValue = 'abc';
			child.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.aValueWas = newValue;
				}
			);

			parent.$digest();
			expect(child.aValueWas).to.equal('abc');
		});

		it('digests from root on $apply when isolated', function () {
			var child = parent.$new(true);
			var child2 = child.$new();

			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			child2.$apply(function(scope) {});

			expect(parent.counter).to.equal(1);
		});

		it('schedules a digest from root on $evalAsync when isolated', function (done) {
			var child = parent.$new(true);
			var child2  = child.$new();

			parent.aValue = 'abc';
			parent.counter = 0;
			parent.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			child2.$evalAsync(function (scope) {});

			setTimeout(function () {
				expect(parent.counter).to.equal(1);
				done();
			}, 50);
		});

		it('executes $evalAsync functions on isolated scopes', function (done) {
			var child = parent.$new(true);

			child.$evalAsync(function (scope) {
				scope.didEvalAsync = true;
			});

			setTimeout(function () {
				expect(child.didEvalAsync).to.be.true;
				done();
			}, 50);
		});

		it('executes $$postDigest functions on isolated scopes', function () {
			var child = parent.$new(true);

			child.$$postDigest(function (scope) {
				child.didPostDigest = true;
			});

			parent.$digest();

			expect(child.didPostDigest).to.be.true;
		});

		it('is no longer digested when $destroy has been called', function () {
			var child = parent.$new();

			child.aValue = [1, 2, 3];
			child.counter = 0;

			child.$watch(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				},
				true
			);

			parent.$digest();
			expect(child.counter).to.equal(1);

			child.aValue.push(4);
			parent.$digest();
			expect(child.counter).to.equal(2);

			child.aValue.push(5);
			child.$destroy();
			parent.$digest();
			expect(child.counter).to.equal(2);
			parent.$digest
		});
	});

	describe('$watchCollection', function() {
		var scope;

		beforeEach(function () {
			publishExternalAPI();
			scope = createInjector(['ng']).get('$rootScope');
		});

		it('works like a normal watch for non-collections', function () {
			var valueProvided;

			scope.aValue = 42;
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) {
					return scope.aValue;
				}, 
				function (newValue, oldValue, scope) {
					valueProvided = newValue;
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
			expect(valueProvided).to.equal(scope.aValue);

			scope.aValue = 43;
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('works like a normal watch for NaNs', function () {
			scope.aValue = 0/0;
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('notices when the value becomes an array', function () {
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arr; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.arr = [1, 2, 3];
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices an item added to an array', function () {
			scope.arr = [1, 2, 3];
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arr; },
				function (newValue, oldValue, scope) {
					scope.counter++;
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.arr.push(4);
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices an item removed from an array', function () {
			scope.arr = [1, 2, 3];
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arr; },
				function (newValue, oldValue, scope) { 
					scope.counter++; 
				}
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.arr.shift();
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices an item replaced in an array', function () {
			scope.arr = [1, 2, 3];
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arr; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.arr[1] = 42;
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices items reordered in an array', function () {
			scope.arr = [1, 2, 3];
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arr; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.arr.sort();
			scope.$digest();
			expect(scope.counter).to.equal(1);
			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('does not fail on NaNs in arrays', function () {
			scope.arr = [2, NaN, 3];
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arr; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('notices an item replaced in an arguments object', function () {
			(function () {
				scope.arrayLike = arguments;
			})(1, 2, 3);
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arrayLike; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.arrayLike[1] = 42;
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices an item replaced in a NodeList object', function () {
			document.documentElement.appendChild(document.createElement('div'));
			scope.arrayLike = document.getElementsByTagName('div');

			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.arrayLike; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			document.documentElement.appendChild(document.createElement('div'));
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices when the value becomes an object', function () {
			scope.counter = 0;

			scope.$watchCollection(
				function (scope) { return scope.obj; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.obj = { a:1 };
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices when an attribute is added to an object', function () {
			scope.counter = 0;
			scope.obj = { a: 1 };

			scope.$watchCollection(
				function (scope) { return scope.obj; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);

			scope.obj.b = 2;
			scope.$digest();
			expect(scope.counter).to.equal(2);

			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('notices when an attribute is changed in an object', function () {

			scope.counter = 0;
			scope.obj = { a: 1 };
			
			scope.$watchCollection(
				function (scope) { return scope.obj; },
				function (newValue, oldValue, scope) { scope.counter++ }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
			
			scope.obj.a = 2;
			scope.$digest();
			expect(scope.counter).to.equal(2);
			
			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('does not fail on NaN attributes in objects', function () {
			scope.counter = 0;
			scope.obj = { a: NaN };

			scope.$watchCollection(
				function (scope) { return scope.obj; },
				function (newValue, oldValue, scope) { scope.counter++; }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('notices when an attribute is removed from an object', function () {
			scope.counter = 0;
			scope.obj = { a: 1 };
			
			scope.$watchCollection(
				function (scope) { return scope.obj; },
				function (newValue, oldValue, scope) { scope.counter++ }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
			
			delete scope.obj.a;
			scope.$digest();
			expect(scope.counter).to.equal(2);
			
			scope.$digest();
			expect(scope.counter).to.equal(2);
		});

		it('does not consider any object with a length property an array', function () {
			scope.counter = 0;
			scope.obj = { length: 42, otherKey: 'abc' };
			
			scope.$watchCollection(
				function (scope) { return scope.obj; },
				function (newValue, oldValue, scope) { scope.counter++ }
			);

			scope.$digest();

			scope.obj.otherKey = 'def';
			scope.$digest();

			expect(scope.counter).to.equal(2);
		});

		it('gives the old non-collection value to listeners', function () {
			scope.aValue = 42;
			var oldValueGiven;

			scope.$watchCollection(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
			);

			scope.$digest();

			scope.aValue = 43;
			scope.$digest();

			expect(oldValueGiven).to.equal(42);
		});

		it('gives the old array value to listeners', function () {
			scope.aValue = [1, 2, 3];
			var oldValueGiven;

			scope.$watchCollection(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
			);

			scope.$digest();

			scope.aValue.push(4);
			scope.$digest();

			expect(oldValueGiven).to.deep.equal([1, 2, 3]);
		});

		it('gives the old object value to listeners', function () {
			scope.aValue = { a: 1, b: 2 };
			var oldValueGiven;
				
			scope.$watchCollection(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
			);

			scope.$digest();

			scope.aValue.c = 3;
			scope.$digest();

			expect(oldValueGiven).to.deep.equal({ a: 1, b: 2 });
		});

		it('uses the new value as the old value on first digest', function () {
			scope.aValue = { a: 1, b: 2 };
			var oldValueGiven;
			
			scope.$watchCollection(
				function (scope) { return scope.aValue; },
				function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
			);

			scope.$digest();

			expect(oldValueGiven).to.deep.equal({ a: 1, b: 2 });
		});

		it('accepts expressions for $watch functions', function () {
			var theValue;

			scope.$watchCollection('[1, 2, 3]', function (newValue, oldValue, scope) {
				theValue = newValue;
			});

			scope.$digest();

			expect(theValue).to.deep.equal([1, 2, 3]);
		});

		it('accepts expressions for listener functions', function () {
			var theValue;

			scope.$watchCollection('[1, 2, 3]', '"one-two-three"');
			scope.$digest();
		});
	});

	describe('Events', function() {
		var parent, scope, child, isolatedChild;

		beforeEach(function () {
			publishExternalAPI();
			parent = createInjector(['ng']).get('$rootScope');
			scope = parent.$new();
			child = scope.$new();
			isolatedChild = scope.$new(true);
		});

		it('allows registering listeners', function () {
			var listener1 = function () {};
			var listener2 = function () {};
			var listener3 = function () {};

			scope.$on('someEvent', listener1);
			scope.$on('someEvent', listener2);
			scope.$on('someOtherEvent', listener3);

			expect(scope.$$listeners).to.deep.equal({
				'someEvent' : [listener1, listener2],
				'someOtherEvent' : [listener3]
			});
		});

		it('registers different event listeners for each scope', function () {
			var listener1 = function () {};
			var listener2 = function () {};
			var listener3 = function () {};

			scope.$on('someEvent', listener1);
			child.$on('someEvent', listener2);
			isolatedChild.$on('someEvent', listener3);

			expect(scope.$$listeners).to.deep.equal({ 'someEvent' : [listener1] });
			expect(child.$$listeners).to.deep.equal({ 'someEvent' : [listener2] });
			expect(isolatedChild.$$listeners).to.deep.equal({ 'someEvent' : [listener3] });
		});

		_.forEach(['$emit','$broadcast'], function (method) {
			it('calls the listeners of the matching event on ' + method, function () {
				var listener1 = sinon.spy();
				var listener2 = sinon.spy();

				scope.$on('someEvent', listener1);
				scope.$on('someOtherEvent', listener2);

				scope[method]('someEvent');

				expect(listener1.called).to.be.true;
				expect(listener2.called).to.be.false;
			});

			it('passes an event object with a name to listeners on ' + method, function () {
				var listener = sinon.spy();

				scope.$on('someEvent', listener);

				scope[method]('someEvent');

				expect(listener.called).to.be.true;
				expect(listener.getCall(0).args[0].name).to.equal('someEvent');
			});

			it('passes the same event object to each listener on ' + method, function () {
				var listener1 = sinon.spy();
				var listener2 = sinon.spy();

				scope.$on('someEvent', listener1);
				scope.$on('someEvent', listener2);

				scope[method]('someEvent');

				expect(listener1.getCall(0).args[0]).to.equal(listener2.getCall(0).args[0]);
			});

			it('passes additional arguments to listeners on ' + method, function () {
				var listener = sinon.spy();

				scope.$on('someEvent', listener);
				scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

				expect(listener.getCall(0).args[1]).to.equal('and');
				expect(listener.getCall(0).args[2]).to.deep.equal(['additional', 'arguments']);
				expect(listener.getCall(0).args[3]).to.equal('...');
			});

			it('returns the event object on ' + method, function () {
				var returnedEvent = scope[method]('someEvent');

				expect(returnedEvent).to.be.defined;
				expect(returnedEvent.name).to.equal('someEvent');
			});

			it('can be deregistered ' + method, function () {
				var listener = sinon.spy();
				var deregister = scope.$on('someEvent', listener);

				deregister();

				scope[method]('someEvent');

				expect(listener.called).to.be.false;
			});

			it('does not skip the next listener when removed on ' + method, function () {
				var deregister;

				var listener = function () {
					deregister();
				};

				var nextListener = sinon.spy();

				deregister = scope.$on('someEvent', listener);
				scope.$on('someEvent', nextListener);

				scope[method]('someEvent');
				expect(nextListener.called).to.be.true;
			});

			it('sets defaultPrevented when preventDefault called on ' + method, function () {
				var listener = function (event) {
					event.preventDefault();
				};

				scope.$on('someEvent', listener);
				var event = scope[method]('someEvent');

				expect(event.defaultPrevented).to.be.true;
			});

			it('does not stop on exceptions on ' + method, function () {
				var listener1 = function (event) {
					throw 'listener1 throwing an exception';
				};
				var listener2 = sinon.spy();

				scope.$on('someEvent', listener1);
				scope.$on('someEvent', listener2);

				scope[method]('someEvent');

				expect(listener2.called).to.be.true;
			});
		});

		it('propagates up the scope heirarchy on $emit', function () {
			var parentListener = sinon.spy();
			var scopeListener = sinon.spy();

			parent.$on('someEvent', parentListener);
			scope.$on('someEvent', scopeListener);

			scope.$emit('someEvent');

			expect(scopeListener.called).to.be.true;
			expect(parentListener.called).to.be.true;
		});

		it('propagates down the scope heirarchy on $broadcast', function () {
			var scopeListener = sinon.spy();
			var childListener = sinon.spy();
			var isolatedChildListener = sinon.spy();

			scope.$on('someEvent', scopeListener);
			child.$on('someEvent', childListener);
			isolatedChild.$on('someEvent', isolatedChildListener);

			scope.$broadcast('someEvent');

			expect(scopeListener.called).to.be.true;
			expect(childListener.called).to.be.true;
			expect(isolatedChildListener.called).to.be.true;

		});

		it('propagates the same event down on $broadcast', function () {
			var scopeListener = sinon.spy();
			var childListener = sinon.spy();

			scope.$on('someEvent', scopeListener);
			child.$on('someEvent', childListener);

			scope.$broadcast('someEvent');
				
			expect(scopeListener.getCall(0).args[0]).to.equal(childListener.getCall(0).args[0]);
		});

		it('attaches targetScope on $emit', function () {
			var scopeListener = sinon.spy();
			var parentListener = sinon.spy();

			scope.$on('someEvent', scopeListener);
			parent.$on('someEvent', parentListener);

			scope.$emit('someEvent');

			expect(scopeListener.getCall(0).args[0].targetScope).to.equal(scope);
			expect(parentListener.getCall(0).args[0].targetScope).to.equal(scope);
		});

		it('attaches targetScope on $broadcast', function () {
			var scopeListener = sinon.spy();
			var childListener = sinon.spy();

			scope.$on('someEvent', scopeListener);
			child.$on('someEvent', childListener);

			scope.$broadcast('someEvent');

			expect(scopeListener.getCall(0).args[0].targetScope).to.equal(scope);
			expect(childListener.getCall(0).args[0].targetScope).to.equal(scope);
		});

		it('attaches current scope on $emit', function () {
			var currentScopeOnScope, currentScopeOnParent;
			var scopeListener = function (event) {
				currentScopeOnScope = event.currentScope;
			};
			var parentListener = function (event) {
				currentScopeOnParent = event.currentScope;
			};

			scope.$on('someEvent', scopeListener);
			parent.$on('someEvent', parentListener);

			scope.$emit('someEvent');

			expect(currentScopeOnScope).to.equal(scope);
			expect(currentScopeOnParent).to.equal(parent);
		});

		it('attaches current scope on $broadcast', function () {
			var currentScopeOnScope, currentScopeOnChild;
			var scopeListener = function (event) {
				currentScopeOnScope = event.currentScope;
			};
			var childListener = function (event) {
				currentScopeOnChild = event.currentScope;
			};

			scope.$on('someEvent', scopeListener);
			child.$on('someEvent', childListener);

			scope.$broadcast('someEvent');

			expect(currentScopeOnScope).to.equal(scope);
			expect(currentScopeOnChild).to.equal(child);
		});

		it('does not propagate to parents when stopped', function () {
			var scopeListener = function (event) {
				event.stopPropagation();
			};

			var parentListener = sinon.spy();

			scope.$on('someEvent', scopeListener);
			parent.$on('someEvent', parentListener);

			scope.$emit('someEvent');

			expect(parentListener.called).to.be.false;
		});

		it('is received by listeners on the current scope after being stopped', function () {
			var listener1 = function (event) {
				event.stopPropagation();
			};
			var listener2 = sinon.spy();

			scope.$on('someEvent', listener1);
			scope.$on('someEvent', listener2);

			scope.$emit('someEvent');

			expect(listener2.called).to.be.true;
		});

		it('fires $destroy when destroyed', function () {
			var listener = sinon.spy();

			scope.$on('$destroy', listener);

			scope.$destroy();

			expect(listener.called).to.be.true;
		});

		it('fires $destroy on children destroyed', function () {
			var listener = sinon.spy();

			child.$on('$destroy', listener);

			scope.$destroy();

			expect(listener.called).to.be.true;
		})
	});

	describe('TTL configurability', function () {
		beforeEach(function () {
			publishExternalAPI();
		});

		it('allows configuring a shorter TTL', function () {
			var injector = createInjector(['ng'], function ($rootScopeProvider) {
				$rootScopeProvider.digestTtl(5);
			});
			var scope = injector.get('$rootScope');

			scope.counterA = 0;
			scope.counterB = 0;

			scope.$watch(
				function (scope) { return scope.counterA; },
				function (newValue, oldValue, scope) {
					if (scope.counterB < 5) {
						scope.counterB++;
					}
				}
			);
			scope.$watch(
				function (scope) { return scope.counterB; },
				function (newValue, oldValue, scope) {
					scope.counterA++;
				}
			);

			expect(function () { scope.$digest(); }).to.throw;
		});
	});	
});