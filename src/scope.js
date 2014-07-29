/* jshint globalstrict: true */
'use strict';

var _ = require('lodash');

var initWatchVal = function () {};

var Scope = function () {
	this.$$watchers = [];
	this.$$lastDirtyWatch = null;
	this.$$asyncQueue = [];
	this.$$postDigestQueue = [];
	this.$$children = [];
	this.$$phase = null;
	this.$$root = this;
};

Scope.prototype.$new = function (isolated) {
	var child;

	if(isolated) {
		child = new Scope();
		child.$$root = this.$$root;
		child.$$asyncQueue = this.$$asyncQueue;
		child.$$postDigestQueue = this.$$postDigestQueue;
	} else {
		var ChildScope = function () {};
		ChildScope.prototype = this;
		child = new ChildScope();
	}

	this.$$children.push(child);
	child.$$watchers = [];
	child.$$children = [];
	child.$parent = this;
	return child;
};

Scope.prototype.$destroy = function () {
	if (this === this.$$root) {
		return;
	}

	var siblings = this.$parent.$$children;
	var indexOfThis = siblings.indexOf(this);
	if(indexOfThis >= 0) {
		siblings.splice(indexOfThis, 1);
	}
};

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
	var self = this;
	var watcher = {
		watchFn: watchFn,
		listenerFn: listenerFn || function () {},
		valueEq: !!valueEq,
		last: initWatchVal
	};
	this.$$watchers.unshift(watcher);
	this.$$root.$$lastDirtyWatch = null;
	return function () {
		var index = self.$$watchers.indexOf(watcher);
		if(index >= 0) {
			self.$$watchers.splice(index, 1);
			self.$$root.$$lastDirtyWatch = null;
		}
	};
};

Scope.prototype.$watchCollection = function (watchFn, listenerFn) {
	var self = this;
	var newValue, oldValue;
	var oldLength;
	var veryOldValue;
	var trackVeryOldValue = (listenerFn.length > 1);
	var changeCount = 0;
	var firstRun = true;

	var internalWatchFn = function (scope) {
		var newLength, key;
		newValue = watchFn(scope);

		if(_.isObject(newValue)) {
			if(_.isArrayLike(newValue)) {
				if(!_.isArray(oldValue)) {
					changeCount++;
					oldValue = [];
				}
				if(newValue.length !== oldValue.length) {
					changeCount++;
					oldValue.length = newValue.length;
				}
				_.forEach(newValue, function (newItem, i) {
					if(newItem !== oldValue[i]) {
						changeCount++;
						oldValue[i] = newItem;
					}
				});
			} else {
				if (!_.isObject(oldValue) || _.isArrayLike(oldValue)) {
					changeCount++;
					oldValue = {};
					oldLength = 0;
				}
				newLength = 0;
				for (key in newValue) {
					if(newValue.hasOwnProperty(key)) {
						newLength++;
						if(oldValue.hasOwnProperty(key)) {
							if(oldValue[key] !== newValue[key]) {
								changeCount++;
								oldValue[key] = newValue[key];
							}
						} else {
							changeCount++;
							oldLength++;
							oldValue[key] = newValue[key];
						}
					}
				}
				if(oldLength > newLength) {
					changeCount++;
					for (key in oldValue) {
						if(oldValue.hasOwnProperty(key) && !newValue.hasOwnProperty(key)) {
							oldLength--;
							delete oldValue[key];
						}
					}
				}
			}
		} else {
			if(!self.$$areEqual(newValue, oldValue, false)) {
				changeCount++;
			}
			oldValue = newValue;
		}

		return changeCount;
	};

	var internalListenerFn = function () {
		if(firstRun) {
			listenerFn(newValue, newValue, self);
			firstRun = false;
		} else {
			listenerFn(newValue, veryOldValue, self);
		}

		if(trackVeryOldValue) { 
			veryOldValue = _.clone(newValue);
		}
	};

	return this.$watch(internalWatchFn, internalListenerFn);
};

Scope.prototype.$$digestOnce = function () {
	var self = this, continueLoop = true, dirty;

	this.$$everyScope(function (scope) {
		var newValue, oldValue;

		_.forEachRight(scope.$$watchers, function (watcher) {
			try {
				if(watcher) {
					newValue = watcher.watchFn(scope);
					oldValue = watcher.last;
					if(!scope.$$areEqual(newValue, oldValue, watcher.valueEq)) {
						self.$$root.$$lastDirtyWatch = watcher;
						watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
						watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), scope);
						dirty = true;
					} else if (self.$$root.$$lastDirtyWatch === watcher) {
						continueLoop = false;
						return false;
					}
				}
			} catch (e) {
				console.error(e);
			}
		});
		return continueLoop;
	});
	
	return dirty;
};

Scope.prototype.$digest = function () {
	var ttl = 10, dirty, asyncTask;
	this.$$root.$$lastDirtyWatch = null;
	this.$beginPhase('$digest');
	do {

		while (this.$$asyncQueue.length) {
			try {
				asyncTask = this.$$asyncQueue.shift();
				asyncTask.scope.$eval(asyncTask.expression);
			} catch (e) {
				console.error(e);
			}
		}

		dirty = this.$$digestOnce();
		if((dirty || this.$$asyncQueue.length) && !(ttl--)) {
			this.$clearPhase();
			throw '10 digest iterations reached';
		}
	} while (dirty || this.$$asyncQueue.length);

	this.$clearPhase();

	while (this.$$postDigestQueue.length) {
		try {
			this.$$postDigestQueue.shift()();
		} catch (e) {
			console.error(e);
		}
	}
};

Scope.prototype.$$postDigest = function (fn) {
	this.$$postDigestQueue.push(fn);
};

Scope.prototype.$apply = function (expr) {
	try {
		this.$beginPhase('$apply');
		return this.$eval(expr);
	} finally {
		this.$clearPhase();
		this.$$root.$digest();
	}
};

Scope.prototype.$eval = function (expr, locals) {
	return expr(this, locals);
};

Scope.prototype.$evalAsync = function (expr) {
	var self = this;
	if(!self.$$phase && !self.$$asyncQueue.length) {
		setTimeout(function () {
			if(self.$$asyncQueue.length) {
				self.$$root.$digest();
			}
		}, 0);
	}
	this.$$asyncQueue.push({
		scope: this,
		expression: expr
	});
};

Scope.prototype.$$everyScope = function (fn) {
	if (fn(this)) {
		return this.$$children.every(function (child) {
			return child.$$everyScope(fn);
		});
	} else {
		return (false);
	}
};

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
	if(valueEq) {
		return _.isEqual(newValue,oldValue);
	} else {
		return newValue === oldValue ||
			(typeof newValue === 'number' && typeof	oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
	}
};

Scope.prototype.$beginPhase = function (phase) {
	if(this.$$phase) {
		throw this.$$phase + ' already in progress.';
	}
	this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
	this.$$phase = null;
};

module.exports = Scope;