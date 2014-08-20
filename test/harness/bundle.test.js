(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint globalstrict: true */
'use strict';

var _ = require('lodash');

var Scope = function () {
	this.$$watchers = [];
	this.$$lastDirtyWatch = null;
	this.$$asyncQueue = [];
	this.$$postDigestQueue = [];
	this.$$phase = null;
};

function initWatchVal() {}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
	var self = this;
	var watcher = {
		watchFn: watchFn,
		listenerFn: listenerFn || function () { },
		valueEq: !!valueEq,
		last: initWatchVal
	};
	this.$$watchers.unshift(watcher);
	this.$$lastDirtyWatch = null;

	return function () {
		var index = self.$$watchers.indexOf(watcher);
		if (index >= 0) {
			self.$$watchers.splice(index, 1);
			self.$$lastDirtyWatch = null;
		}
	};
}

Scope.prototype.$$digestOnce = function () {
	var self = this;
	var newValue, oldValue, dirty;
	_.forEachRight(this.$$watchers, function (watcher) {
		try {
			if(watcher) {
				newValue = watcher.watchFn(self);
				oldValue = watcher.last;
				if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
					self.$$lastDirtyWatch = watcher;
					watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
					watcher.listenerFn(newValue, oldValue, self);
					dirty = true;
				} else if (self.$$lastDirtyWatch === watcher) {
					return false;
				}
			}
		} catch (e) {
			console.error(e);
		}
	});
	return dirty;
};

Scope.prototype.$digest = function () {
	var ttl = 10;
	var dirty;
	this.$$lastDirtyWatch = null;
	this.$beginPhase('$digest');
	do {
		while (this.$$asyncQueue.length) {
			var asyncTask = this.$$asyncQueue.shift();
			asyncTask.scope.$eval(asyncTask.expression);
		}
		dirty = this.$$digestOnce();
		if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
			this.$clearPhase();
			throw "10 digest iterations reached";
		}
	} while (dirty || this.$$asyncQueue.length);
	this.$clearPhase();

	while (this.$$postDigestQueue.length) {
		this.$$postDigestQueue.shift()();
	}
};

Scope.prototype.$$postDigest = function (fn) {
	this.$$postDigestQueue.push(fn);
};

Scope.prototype.$eval = function (expr, locals) {
	return expr(this, locals);
};

Scope.prototype.$evalAsync = function (expr) {
	var self = this;
	if(!self.$$phase && !self.$$asyncQueue.length) {
		setTimeout(function () {
			if (self.$$asyncQueue.length) {
				self.$digest();
			}
		}, 0);
	}
	self.$$asyncQueue.push({
		scope: self,
		expression: expr
	});
};

Scope.prototype.$apply = function (expr) {
	try {
		this.$beginPhase('$apply');
		return this.$eval(expr);
	} finally {
		this.$clearPhase();
		this.$digest();
	}
};

Scope.prototype.$beginPhase = function (phase) {
	if (this.$$phase) {
		throw this.$$phase + ' already in progress.';
	}
	this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
	this.$$phase = null;
}

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
	if (valueEq) {
		return _.isEqual(newValue, oldValue);
	} else {
		return newValue === oldValue || 
			(typeof newValue === 'number' && typeof oldValue === 'number' 
				&& isNaN(newValue) && isNaN(oldValue));
	}
};

module.exports = Scope;
},{"lodash":"K2RcUv"}],2:[function(require,module,exports){
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

		it('calls the listener function when the watched value changes', function () {
			scope.someValue = 'a';
			scope.counter = 0;

			scope.$watch(
				function (scope) { return scope.someValue; },
				function (newValue, oldValue, scope) { scope.counter++; }
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
				function (newValue, oldValue, scope) { scope.counter++ }
			);

			scope.$digest();
			expect(scope.counter).to.equal(1);
		});

		it('may have watchers that omit the listener function', function () {
			var watchFn = sinon.stub().returns('something');
			scope.$watch(watchFn);

			scope.$digest();

			expect(watchFn.called).to.be.true;
		});

		it('triggers chained watchers in the same digest', function () {
			scope.name = 'Jane';

			scope.$watch(
				function (scope) { return scope.nameUpper; },
				function (newValue, oldValue, scope) { 
					if (newValue) {
						scope.initial = newValue.substring(0, 1) + '.';
					}
				}
			);

			scope.$watch(
				function (scope) { return scope.name; },
				function (newValue, oldValue, scope) {
					if (newValue) {
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

			expect((function () { scope.$digest(); })).to.throw;
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

		it('does not end digest so that new watches are not run', function () {
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
			scope.model = {
				aValue: [1, 2, 3],
				counter: 0
			};

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) {
					scope.model.counter++;
				},
				true
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);

			scope.model.aValue.push(4);
			scope.$digest();
			expect(scope.model.counter).to.equal(2);
		});

		it('correctly handles NaNs', function () {
			scope.model = {
				number: 0/0, // NaN
				counter: 0
			};

			scope.$watch(
				function (scope) { return scope.model.number; },
				function (newValue, oldValue, scope) {
					scope.model.counter++;
				}
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);
		});

		it('executes $eval\'ed function and returns result', function () {
			scope.model = {
				aValue : 42
			};

			var result = scope.$eval(function (scope) {
				return scope.model.aValue;
			});

			expect(result).to.equal(42);
		});

		it('passes the second $eval argument straight through', function () {
			scope.model = {
				aValue : 42
			};

			var result = scope.$eval(function (scope, arg) {
				return scope.model.aValue + arg;
			}, 2);

			expect(result).to.equal(44);
		});

		it('executes $apply\'ed function and starts the digest', function () {
			scope.model = {
				aValue: 'someValue',
				counter: 0
			};

			scope.$watch(
				function (scope) {
					return scope.model.aValue;
				},
				function (newValue, oldValue, scope) {
					scope.model.counter++;
				}
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);

			scope.$apply(function (scope) {
				scope.model.aValue = 'someOtherValue';
			});

			expect(scope.model.counter).to.equal(2);
		});

		it('executes $evalAsynced function later in the same cycle', function () {
			scope.model = {
				aValue: [1, 2, 3],
				asyncEvaluated: false,
				asyncEvaluatedImmediately: false
			};

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) {
					scope.$evalAsync(function (scope) {
						scope.model.asyncEvaluated = true;
					});
					scope.model.asyncEvaluatedImmediately = scope.model.asyncEvaluated;
				}
			);

			scope.$digest();
			expect(scope.model.asyncEvaluated).to.be.true;
			expect(scope.model.asyncEvaluatedImmediately).to.be.false;
		});

		it('executes $evalAsynced functions added by watch functions', function () {
			scope.model = {
				aValue: [1, 2, 3],
				asyncEvaluated: false
			};

			scope.$watch(
				function (scope) {
					if (!scope.model.asyncEvaluated) {
						scope.$evalAsync(function (scope) {
							scope.model.asyncEvaluated = true;
						});
					}
					return scope.model.aValue;
				},
				function (newValue, oldValue, scope) {}
			);

			scope.$digest();

			expect(scope.model.asyncEvaluated).to.be.true;
		});

		it('executes $evalAsynced functions even when not dirty', function () {
			scope.model = {
				aValue: [1, 2, 3],
				asyncEvaluatedTimes: 0
			};

			scope.$watch(
				function (scope) {
					if (scope.model.asyncEvaluatedTimes < 2) {
						scope.$evalAsync(function (scope) {
							scope.model.asyncEvaluatedTimes++;
						});
					}
					return scope.model.aValue;
				},
				function (newValue, oldValue, scope) {}
			);

			scope.$digest();

			expect(scope.model.asyncEvaluatedTimes).to.equal(2);
		});

		it('has a $$phase field whose value is the current digest phase', function () {
			scope.model = {
				aValue: [1, 2, 3],
				phaseInWatchFunction: undefined,
				phaseInListenerFunction: undefined,
				phaseInApplyFunction: undefined
			};

			scope.$watch(
				function (scope) {
					scope.model.phaseInWatchFunction = scope.$$phase;
					return scope.model.aValue
				},
				function (newValue, oldValue, scope) {
					scope.model.phaseInListenerFunction = scope.$$phase;
				}
			);

			scope.$apply(function (scope) {
				scope.model.phaseInApplyFunction = scope.$$phase;
			});

			expect(scope.model.phaseInWatchFunction).to.equal('$digest');
			expect(scope.model.phaseInListenerFunction).to.equal('$digest');
			expect(scope.model.phaseInApplyFunction).to.equal('$apply');
		});

		it('schedules a digest in $evalAsync', function (done) {
			scope.model = {
				aValue: 'abc',
				counter: 0
			};

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);

			scope.$evalAsync(function (scope) {});

			expect(scope.model.counter).to.equal(0);
			setTimeout(function () {
				expect(scope.model.counter).to.equal(1);
				done();
			}, 50);
		});

		it('runs a $$postDigest function after each digest', function () {
			scope.model = {
				counter: 0
			};

			scope.$$postDigest(function () {
				scope.model.counter++;
			});

			expect(scope.model.counter).to.equal(0);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);
		});

		it('does not include $$postDigest in the digest', function () {
			scope.model = {
				aValue: 'original value'
			};

			scope.$$postDigest(function () {
				scope.model.aValue = 'changed value';
			});

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) {
					scope.model.watchedValue = newValue;
				}
			);

			scope.$digest();
			expect(scope.model.watchedValue).to.equal('original value');

			scope.$digest();
			expect(scope.model.watchedValue).to.equal('changed value');
		});

		it('catches exceptions in watch functions and continues', function () {
			scope.model = {
				aValue: 'abc',
				counter: 0
			};

			scope.$watch(
				function (scope) { throw 'PEBKAC error'; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);
			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);
		});

		it('catches exceptions in listener functions and continues', function () {
			scope.model = {
				aValue: 'abc',
				counter: 0
			};

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { throw "ERMAHGERD! SNER!"; }
			);
			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);
		});

		it('allows destroying a $watch with a removal function', function () {
			scope.model = {
				aValue: 'abc',
				counter: 0
			};

			var destroyWatch = scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);

			scope.model.aValue = 'def';
			scope.$digest();
			expect(scope.model.counter).to.equal(2);

			scope.model.aValue = 'ghi';
			destroyWatch();
			scope.$digest();
			expect(scope.model.counter).to.equal(2);
		});

		it('allows destroying a $watch during digest', function () {
			scope.model = {
				aValue: 'abc'
			};

			var watchCalls = [];

			scope.$watch(
				function (scope) {
					watchCalls.push('first');
					return scope.model.aValue;
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
					return scope.model.aValue;
				}
			);

			scope.$digest();
			expect(watchCalls).to.deep.equal(['first', 'second', 'third', 'first', 'third']);

		});

		it('allows a $watch to destroy another during digest', function () {
			scope.model = {
				aValue: 'abc',
				counter: 0
			};

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { destroyWatch(); }
			);

			var destroyWatch = scope.$watch(
				function (scope) { },
				function (newValue, oldValue, scope) {}
			);

			scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(1);
		});

		it('allows destroying several $watches during digest', function () {
			scope.model = {
				aValue: 'abc',
				counter: 0
			};

			var destroyWatch1 = scope.$watch(
				function (scope) {
					destroyWatch1();
					destroyWatch2();
				}
			);

			var destroyWatch2 = scope.$watch(
				function (scope) { return scope.model.aValue; },
				function (newValue, oldValue, scope) { scope.model.counter++; }
			);

			scope.$digest();
			expect(scope.model.counter).to.equal(0);
		});

	});
});
},{"../src/scope":1,"lodash":"K2RcUv"}]},{},[2])