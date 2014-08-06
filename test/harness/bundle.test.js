(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":3}],2:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],3:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("qvMYcC"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":2,"inherits":4,"qvMYcC":5}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
/* jshint globalstrict: true */
'use strict';

var _ = require('lodash');

_.mixin({
	isArrayLike: function (obj) {
		if(_.isNull(obj) || _.isUndefined(obj)) {
			return false;
		}

		var length = obj.length;
		return length === 0 || (_.isNumber(length) && length > 0 && (length - 1) in obj);
	}
});
},{"lodash":"K2RcUv"}],7:[function(require,module,exports){
/* jshint globalstrict: true */
'use strict';

var _ = require('lodash');

var ESCAPES = {'n':'\n', 'f':'\f', 'r':'\r', 't':'\t', 'v':'\v', '\'':'\'', '"':'"'};

var OPERATORS = {
	'null': _.constant(null),
	'true': _.constant(true),
	'false': _.constant(false),
	'+': function(self, locals, a, b) {
		a = a(self, locals);
		b = b(self, locals);
		if (!_.isUndefined(a)) {
			if (!_.isUndefined(b)) {
				return a + b;
			} else {
				return a;
			}
		}
		return b;
	},
	'!': function(self, locals, a) {
		return !a(self, locals);
	},
	'-': function(self, locals, a, b) {
		a = a(self, locals);
		b = b(self, locals);
		return (_.isUndefined(a) ? 0 : a) - (_.isUndefined(b) ? 0 : b);
	},
	'*': function(self, locals, a, b) {
		return a(self, locals) * b(self, locals);
	},
	'/': function(self, locals, a, b) {
		return a(self, locals) / b(self, locals);
	},
	'%': function(self, locals, a, b) {
		return a(self, locals) % b(self, locals);
	},
	'<': function(self, locals, a, b) {
		return a(self, locals) < b(self, locals);
	},
	'>': function(self, locals, a, b) {
		return a(self, locals) > b(self, locals);
	},
	'<=': function(self, locals, a, b) {
		return a(self, locals) <= b(self, locals);
	},
	'>=': function(self, locals, a, b) {
		return a(self, locals) >= b(self, locals);
	},
	'==': function(self, locals, a, b) {
		return a(self, locals) == b(self, locals);
	},
	'!=': function(self, locals, a, b) {
		return a(self, locals) != b(self, locals);
	},
	'===': function(self, locals, a, b) {
		return a(self, locals) === b(self, locals);
	},
	'!==': function(self, locals, a, b) {
		return a(self, locals) !== b(self, locals);
	},
	'=': _.noop,
	'&&': function(self, locals, a, b) {
		return a(self, locals) && b(self, locals);
	},
	'||': function(self, locals, a, b) {
		return a(self, locals) || b(self, locals);
	}
};

var ensureSafeMemberName = function(name) {
	if (name === 'constructor') {
		throw 'Referencing "constructor" field in Angular expressions is disallowed!';
	}
};

var ensureSafeObject = function(obj) {
	if (obj) {
		if (obj.document && obj.location && obj.alert && obj.setInterval) {
			throw 'Referencing window in Angular expressions is disallowed!';
		} else if (obj.children && (obj.nodeName || (obj.prop && obj.attr && obj.find))) {
			throw 'Referencing DOM nodes in Angular expressions is disallowed!';
		} else if (obj.constructor === obj) {
			throw "Referencing Function in Angular expressions is disallowed!";
		}
	}
	return obj;
};

var simpleGetterFn1 = function(key) {
	ensureSafeMemberName(key);
	return function(scope, locals) {
		if (!scope) {
			return undefined;
		}
		return (locals && locals.hasOwnProperty(key)) ? locals[key] : scope[key];
	};
};

var simpleGetterFn2 = function(key1, key2) {
	ensureSafeMemberName(key1);
	ensureSafeMemberName(key2);
	return function(scope, locals) {
		if (!scope) {
			return undefined;
		}
		scope = (locals && locals.hasOwnProperty(key1)) ? locals[key1] : scope[key1];
		return scope ? scope[key2] : undefined;
	};
};

var generatedGetterFn = function(keys) {
	var code = '';
	_.forEach(keys, function(key, idx) {
		ensureSafeMemberName(key);
		code += 'if (!scope) { return undefined; }\n';
		if (idx === 0) {
			code += 'scope = (locals && locals.hasOwnProperty("'+key+'")) ? locals["'+key+'"] : scope["' + key + '"];\n';
		} else {
			code += 'scope = scope["' + key + '"];\n';
		}
	});
	code += 'return scope;\n';
	/* jshint -W054 */
	return new Function('scope', 'locals', code);
	/* jshint +W054 */
};

var getterFn = _.memoize(function(ident) {
	var pathKeys = ident.split('.');
	if (pathKeys.length === 1) {
		return simpleGetterFn1(pathKeys[0]);
	} else if (pathKeys.length === 2) {
		return simpleGetterFn2(pathKeys[0], pathKeys[1]);
	} else {
		return generatedGetterFn(pathKeys);
	}
});

var setter = function(object, path, value) {
	var keys = path.split('.');
	while (keys.length > 1) {
		var key = keys.shift();
		ensureSafeMemberName(key);
		if (!object.hasOwnProperty(key)) {
			object[key] = {};
		}
		object = object[key];
	}
	object[keys.shift()] = value;
	return value;
};

function Lexer() {

}

Lexer.prototype.lex = function(text) {
	this.text = text;
	this.index = 0;
	this.ch = undefined;
	this.tokens = [];

	while (this.index < this.text.length) {
		this.ch = this.text.charAt(this.index);
		if (this.isNumber(this.ch) ||
					(this.is('.') && this.isNumber(this.peek()))) {
			this.readNumber();
		} else if (this.is('\'"')) {
			this.readString(this.ch);
		} else if (this.is('[],{}:.()?;')) {
			this.tokens.push({
				text: this.ch,
				json: true
			});
			this.index++;
		} else if (this.isIdent(this.ch)) {
			this.readIdent();
		} else if (this.isWhitespace(this.ch)) {
			this.index++;
		} else {
			var ch2 = this.ch + this.peek();
			var ch3 = this.ch + this.peek() + this.peek(2);
			var fn = OPERATORS[this.ch];
			var fn2 = OPERATORS[ch2];
			var fn3 = OPERATORS[ch3];
			if (fn3) {
				this.tokens.push({
					text: ch3,
					fn: fn3
				});
				this.index += 3;
			} else if (fn2) {
				this.tokens.push({
					text: ch2,
					fn: fn2
				});
				this.index += 2;
			} else if (fn) {
				this.tokens.push({
					text: this.ch,
					fn: fn
				});
				this.index++;
			} else {
				throw 'Unexpected next character: '+this.ch;
			}
		}
	}

	return this.tokens;
};

Lexer.prototype.is = function(chs) {
	return chs.indexOf(this.ch) >= 0;
};

Lexer.prototype.isNumber = function(ch) {
	return '0' <= ch && ch <= '9';
};

Lexer.prototype.isExpOperator = function(ch) {
	return ch === '-' || ch === '+' || this.isNumber(ch);
};

Lexer.prototype.isIdent = function(ch) {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
		ch === '_' || ch === '$';
};

Lexer.prototype.isWhitespace = function(ch) {
	return (ch === ' ' || ch === '\r' || ch === '\t' ||
		ch === '\n' || ch === '\v' || ch === '\u00A0');
};

Lexer.prototype.readNumber = function() {
	var number = '';

	while (this.index < this.text.length) {
		var ch = this.text.charAt(this.index).toLowerCase();
		if (ch === '.' || this.isNumber(ch)) {
			number += ch;
		} else {
			var nextCh = this.peek();
			var prevCh = number.charAt(number.length - 1);
			if (ch === 'e' && this.isExpOperator(nextCh)) {
				number += ch;
			} else if (this.isExpOperator(ch) && prevCh === 'e' &&
								 nextCh && this.isNumber(nextCh)) {
				number += ch;
			} else if (this.isExpOperator(ch) && prevCh === 'e' &&
								 (!nextCh || !this.isNumber(nextCh))) {
				throw "Invalid exponent";
			} else {
				break;
			}
		}
		this.index++;
	}

	number = 1 * number;
	this.tokens.push({
		text: number,
		fn: _.constant(number),
		json: true
	});
};

Lexer.prototype.readString = function(quote) {
	this.index++;
	var rawString = quote;
	var string = '';
	var escape = false;
	while (this.index < this.text.length) {
		var ch = this.text.charAt(this.index);
		rawString += ch;
		if (escape) {
			if (ch === 'u') {
				var hex = this.text.substring(this.index + 1, this.index + 5);
				if (!hex.match(/[\da-f]{4}/i)) {
					throw 'Invalid unicode escape';
				}
				this.index += 4;
				string = String.fromCharCode(parseInt(hex, 16));
			} else {
				var replacement = ESCAPES[ch];
				if (replacement) {
					string += replacement;
				} else {
					string += ch;
				}
			}
			escape = false;
		} else if (ch === quote) {
			this.index++;
			this.tokens.push({
				text: rawString,
				string: string,
				json: true,
				fn: _.constant(string)
			});
			return;
		} else if (ch === '\\') {
			escape = true;
		} else {
			string += ch;
		}
		this.index++;
	}
	throw 'Unmatched quote';
};


Lexer.prototype.readIdent = function() {
	var text = '';
	var start = this.index;
	var lastDotAt;
	while (this.index < this.text.length) {
		var ch = this.text.charAt(this.index);
		if (ch === '.' || this.isIdent(ch) || this.isNumber(ch)) {
			if (ch === '.') {
				lastDotAt = this.index;
			}
			text += ch;
		} else {
			break;
		}
		this.index++;
	}

	var methodName;
	if (lastDotAt) {
		var peekIndex = this.index;
		while (this.isWhitespace(this.text.charAt(peekIndex))) {
			peekIndex++;
		}
		if (this.text.charAt(peekIndex) === '(') {
			methodName = text.substring(lastDotAt - start + 1);
			text = text.substring(0, lastDotAt - start);
		}
	}

	var token = {text: text};
	if (OPERATORS.hasOwnProperty(text)) {
		token.fn = OPERATORS[text];
		token.json = OPERATORS[text];
	} else {
		token.fn = getterFn(text);
		token.fn.assign = function(self, value) {
			return setter(self, text, value);
		};
	}

	this.tokens.push(token);

	if (methodName) {
		this.tokens.push({
			text: '.',
			json: false
		});
		this.tokens.push({
			text: methodName,
			fn: getterFn(methodName),
			json: false
		});
	}
};


Lexer.prototype.peek = function(n) {
	n = n || 1;
	return this.index + n < this.text.length ?
		this.text.charAt(this.index + n) :
		false;
};

Lexer.prototype.is = function(chs) {
	return chs.indexOf(this.ch) >= 0;
};


function Parser(lexer) {
	this.lexer = lexer;
}

Parser.ZERO = _.extend(_.constant(0), {constant: true});

Parser.prototype.parse = function(text) {
	this.tokens = this.lexer.lex(text);
	return this.statements();
};

Parser.prototype.statements = function() {
	var statements = [];
	do {
		statements.push(this.assignment());
	} while (this.expect(';'));

	if(statements.length === 1) {
		return statements[0];
	} else {
		return function (self, locals) {
			var value;
			_.forEach(statements, function (statement) {
				value = statement(self, locals);
			});
			return value;
		}
	}
};

Parser.prototype.assignment = function() {
	var left = this.ternary();
	if (this.expect('=')) {
		if (!left.assign) {
			throw 'Implies assignment but cannot be assigned to';
		}
		var right = this.ternary();
		return function(scope, locals) {
			return left.assign(scope, right(scope, locals), locals);
		};
	}
	return left;
};

Parser.prototype.ternary = function() {
	var left = this.logicalOR();
	if (this.expect('?')) {
		var middle = this.ternary();
		this.consume(':');
		var right = this.ternary();
		var ternaryFn = function(self, locals) {
			return left(self, locals) ? middle(self, locals) : right(self, locals);
		};
		ternaryFn.constant = left.constant && middle.constant && right.constant;
		return ternaryFn;
	} else {
		return left;
	}
};

Parser.prototype.logicalOR = function() {
	var left = this.logicalAND();
	var operator;
	while ((operator = this.expect('||'))) {
		left = this.binaryFn(left, operator.fn, this.logicalOR());
	}
	return left;
};
Parser.prototype.logicalAND = function() {
	var left = this.equality();
	var operator;
	while ((operator = this.expect('&&'))) {
		left = this.binaryFn(left, operator.fn, this.equality());
	}
	return left;
};

Parser.prototype.equality = function() {
	var left = this.relational();
	var operator;
	while ((operator = this.expect('==', '!=', '===', '!=='))) {
		left = this.binaryFn(left, operator.fn, this.relational());
	}
	return left;
};

Parser.prototype.relational = function() {
	var left = this.additive();
	var operator;
	while ((operator = this.expect('<', '>', '<=', '>='))) {
		left = this.binaryFn(left, operator.fn, this.additive());
	}
	return left;
};

Parser.prototype.additive = function() {
	var left = this.multiplicative();
	var operator;
	while ((operator = this.expect('+', '-'))) {
		left = this.binaryFn(left, operator.fn, this.multiplicative());
	}
	return left;
};

Parser.prototype.multiplicative = function() {
	var left = this.unary();
	var operator;
	while ((operator = this.expect('*', '/', '%'))) {
		left = this.binaryFn(left, operator.fn, this.unary());
	}
	return left;
};

Parser.prototype.unary = function() {
	var parser = this;
	var operator;
	if (this.expect('+')) {
		return this.primary();
	} else if ((operator = this.expect('!'))) {
		var operand = parser.unary();
		var unaryFn = function(self, locals) {
			return operator.fn(self, locals, operand);
		};
		unaryFn.constant = operand.constant;
		return unaryFn;
	} else if ((operator = this.expect('-'))) {
		return this.binaryFn(Parser.ZERO, operator.fn, parser.unary());
	} else {
		return this.primary();
	}
};


Parser.prototype.primary = function() {
	var primary;
	if (this.expect('(')) {
		primary = this.assignment();
		this.consume(')');
	} else if (this.expect('[')) {
		primary = this.arrayDeclaration();
	} else if (this.expect('{')) {
		primary = this.object();
	} else {
		var token = this.expect();
		primary = token.fn;
		if (token.json) {
			primary.constant = true;
			primary.literal = true;
		}
	}

	var next;
	var context;
	while ((next = this.expect('[', '.', '('))) {
		 if (next.text === '[') {
			context = primary;
			primary = this.objectIndex(primary);
		} else if (next.text === '.') {
			context = primary;
			primary = this.fieldAccess(primary);
		} else if (next.text === '(') {
			primary = this.functionCall(primary, context);
			context = undefined;
		}
	}
	return primary;
};

Parser.prototype.binaryFn = function(left, op, right) {
	var fn = function(self, locals) {
		return op(self, locals, left, right);
	};
	fn.constant = left.constant && right.constant;
	return fn;
};

Parser.prototype.arrayDeclaration = function() {
	var elementFns = [];
	if (!this.peek(']')) {
		do {
			if (this.peek(']')) {
				break;
			}
			elementFns.push(this.assignment());
		} while (this.expect(','));
	}
	this.consume(']');
	var arrayFn = function(scope, locals) {
		var elements = _.map(elementFns, function(elementFn) {
			return elementFn(scope, locals);
		});
		return elements;
	};
	arrayFn.literal = true;
	arrayFn.constant = _.every(elementFns, 'constant');
	return arrayFn;
};

Parser.prototype.object = function() {
	var keyValues = [];
	if (!this.peek('}')) {
		do {
			var keyToken = this.expect();
			this.consume(':');
			var valueExpression = this.assignment();
			keyValues.push({key: keyToken.string || keyToken.text, value: valueExpression});
		} while (this.expect(','));
	}
	this.consume('}');
	var objectFn = function(scope, locals) {
		var object = {};
		_.forEach(keyValues, function(kv) {
			object[kv.key] = kv.value(scope, locals);
		});
		return object;
	};
	objectFn.literal = true;
	objectFn.constant = _(keyValues).pluck('value').every('constant');
	return objectFn;
};


Parser.prototype.objectIndex = function(objFn) {
	var indexFn = this.primary();
	this.consume(']');
	var objectIndexFn = function(scope, locals) {
		var obj = objFn(scope, locals);
		var index = indexFn(scope, locals);
		return ensureSafeObject(obj[index]);
	};
	objectIndexFn.assign = function(self, value, locals) {
		var obj = ensureSafeObject(objFn(self, locals));
		var index = indexFn(self, locals);
		return (obj[index] = value);
	};
	return objectIndexFn;
};

Parser.prototype.fieldAccess = function(objFn) {
	var token = this.expect();
	var getter = token.fn;
	var fieldAccessFn = function(scope, locals) {
		var obj = objFn(scope, locals);
		return getter(obj);
	};
	fieldAccessFn.assign = function(self, value, locals) {
		var obj = objFn(self, locals);
		return setter(obj, token.text, value);
	};
	return fieldAccessFn;
};


Parser.prototype.functionCall = function(fnFn, contextFn) {
	var argFns = [];
	if (!this.peek(')')) {
		do {
			argFns.push(this.primary());
		} while (this.expect(','));
	}
	this.consume(')');
	return function(scope, locals) {
		var context = ensureSafeObject(contextFn ? contextFn(scope, locals) : scope);
		var fn = ensureSafeObject(fnFn(scope, locals));
		var args = _.map(argFns, function(argFn) { return argFn(scope, locals); });
		return ensureSafeObject(fn.apply(context, args));
	};
};

Parser.prototype.peek = function(e1, e2, e3, e4) {
	if (this.tokens.length > 0) {
		var text = this.tokens[0].text;
		if (text === e1 || text === e2 || text === e3 || text === e4 ||
				(!e1 && !e2 && !e3 && !e4)) {
			return this.tokens[0];
		}
	}
};

Parser.prototype.expect = function(e1, e2, e3, e4) {
	var token = this.peek(e1, e2, e3, e4);
	if (token) {
		return this.tokens.shift();
	}
};

Parser.prototype.consume = function(e) {
	if (!this.expect(e)) {
		throw 'Unexpected. Expecting '+e;
	}
};


function parse(expr) {
	switch (typeof expr) {
		case 'string':
			var lexer = new Lexer();
			var parser = new Parser(lexer);
			return parser.parse(expr);
		case 'function':
			return expr;
		default:
			return _.noop;
	}
}

module.exports = parse;

},{"lodash":"K2RcUv"}],8:[function(require,module,exports){
/* jshint globalstrict: true */
/* global parse: false */
'use strict';

var _ = require('lodash');
var parse = require('./parse');

var initWatchVal = function () {};

var Scope = function () {
	this.$$watchers = [];
	this.$$lastDirtyWatch = null;
	this.$$asyncQueue = [];
	this.$$postDigestQueue = [];
	this.$$children = [];
	this.$$listeners = {};
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
	child.$$listeners = {};
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
		this.$broadcast('$destroy');
		siblings.splice(indexOfThis, 1);
	}
};

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
	var self = this;

	watchFn = parse(watchFn);
	listenerFn = parse(listenerFn);

	var watcher = {
		watchFn: watchFn,
		listenerFn: listenerFn,
		valueEq: !!valueEq,
		last: initWatchVal
	};

	if(watchFn.constant) {
		watcher.listenerFn = function (newValue, oldValue, scope) {
			listenerFn(newValue, oldValue, scope);
			var index = self.$$watchers.indexOf(watcher);
			if (index >= 0) {
				self.$$watchers.splice(index, 1);
			}
		};
	}

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

	watchFn = parse(watchFn);
	listenerFn = parse(listenerFn);

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
	return parse(expr)(this, locals);
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

Scope.prototype.$on = function (eventName, listener) {
	var listeners = this.$$listeners[eventName];
	if(!listeners) {
		this.$$listeners[eventName] = listeners = [];
	}
	listeners.push(listener);

	return function () {
		var index = listeners.indexOf(listener);
		if(index >= 0) {
			listeners[index] = null;
		}
	};	
};

Scope.prototype.$emit = function (eventName) {
	var propagationStopped = false;
	var event = { 
		name: eventName,
		targetScope: this,
		stopPropagation: function () {
			propagationStopped = true
		},
		preventDefault: function () {
			event.defaultPrevented = true
		}
	};
	var listenerArgs = [event].concat(_.rest(arguments));
	var scope = this;
	do {
		event.currentScope = scope;
		scope.$$fireEventOnScope(eventName, listenerArgs);
		scope = scope.$parent;
	} while (scope && !propagationStopped);
	return event;
};

Scope.prototype.$broadcast = function (eventName) {
	var event = { 
		name: eventName,
		targetScope: this,
		preventDefault: function () {
			event.defaultPrevented = true
		}
	};
	var listenerArgs = [event].concat(_.rest(arguments));
	this.$$everyScope(function (scope) {
		event.currentScope = scope;
		scope.$$fireEventOnScope(eventName, listenerArgs);
		return true;
	});
	return event;
};

Scope.prototype.$$fireEventOnScope = function (eventName, listenerArgs) {
	var listeners = this.$$listeners[eventName] || [];
	var i = 0;

	while(i < listeners.length) {
		if(listeners[i] === null) {
			listeners.splice(i, 1);
		} else {
			try {
				listeners[i].apply(null, listenerArgs);
			} catch (e) {
				console.error(e);
			}
			i++;
		}
	}
	return event;
};

module.exports = Scope;
},{"./parse":7,"lodash":"K2RcUv"}],9:[function(require,module,exports){
/* jshint globalstrict: true */
/* global parse: false */
'use strict';
var parse = require('../src/parse');
var _ = require('lodash');

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
});
},{"../src/parse":7,"lodash":"K2RcUv"}],10:[function(require,module,exports){
/* jshint globalstrict:true */
/* global Scope: false */
'use strict';

var Scope = require('../src/scope');
var Angular = require('../src/myAngular');
var _ = require('lodash');
var assert = require('assert');

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
		it('inherits the parent\'s properties', function () {
			var parent = new Scope();
			parent.aValue = [1, 2, 3];

			var child = parent.$new();

			expect(child.aValue).to.deep.equal([1, 2, 3]);
		});

		it('does not cause a parent to inherit its properties', function () {
			var parent = new Scope();

			var child = parent.$new();
			child.aValue = [1, 2, 3];

			expect(parent.aValue).to.be.undefined;
		});

		it('inherits the parent\'s properties whenever they are defined', function () {
			var parent = new Scope();

			var child = parent.$new();

			parent.aValue = [1, 2, 3];

			expect(child.aValue).to.deep.equal([1, 2, 3]);
		});

		it('can manipulate a parent scopes property', function () {
			var parent = new Scope();
			var child = parent.$new();
			parent.aValue = [1, 2, 3];

			child.aValue.push(4);

			expect(child.aValue).to.deep.equal([1, 2, 3, 4]);
			expect(parent.aValue).to.deep.equal([1, 2, 3, 4]);
		});

		it('can watch a property in the parent', function () {
			var parent = new Scope();
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
			var a = new Scope();
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
			var parent = new Scope();
			var child = parent.$new();
			
			parent.name = 'Joe';
			child.name = 'Jill';

			expect(child.name).to.equal('Jill');
			expect(parent.name).to.equal('Joe');
		});

		it('does not shadow members of parent scopes attributes', function () {
			var parent = new Scope();
			var child = parent.$new();

			parent.user = { name: 'Joe' };
			child.user.name = 'Jill';

			expect(child.user.name).to.equal('Jill');
			expect(parent.user.name).to.equal('Jill');
		});

		it('does not digest its parents', function () {
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
			var child = parent.$new(true);

			parent.aValue = 'abc';

			expect(child.aValue).to.be.undefined;
		});

		it('cannot watch parent attributes when isolated', function () {
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
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
			var parent = new Scope();
			var child = parent.$new(true);

			child.$$postDigest(function (scope) {
				child.didPostDigest = true;
			});

			parent.$digest();

			expect(child.didPostDigest).to.be.true;
		});

		it('is no longer digested when $destroy has been called', function () {
			var parent = new Scope();
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
			scope = new Scope();
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
			parent = new Scope();
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
});
},{"../src/myAngular":6,"../src/scope":8,"assert":1,"lodash":"K2RcUv"}]},{},[9,10])