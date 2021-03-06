var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');
var _ = require('lodash');
var $ = require('jquery');

function makeInjectorWithDirectives() {
	var args = arguments;
	return createInjector(['ng', function ($compileProvider) {
		$compileProvider.directive.apply($compileProvider, args);
	}]);
}

describe('$compile', function () {

	beforeEach(function () {
		delete window.angular;
		publishExternalAPI();
	});

	it('allows creating directives', function () {
		var myModule = window.angular.module('myModule', []);
		myModule.directive('testing', function () {});
		var injector = createInjector(['ng', 'myModule']);
		expect(injector.has('testingDirective')).to.be.true;
	});

	it('allows creating many directives with the same name', function () {
		var myModule = window.angular.module('myModule', []);
		myModule.directive('testing', _.constant({ d: 'one' }));
		myModule.directive('testing', _.constant({ d: 'two' }));
		var injector = createInjector(['ng', 'myModule']);

		var result = injector.get('testingDirective');
		expect(result.length).to.equal(2);
		expect(result[0].d).to.equal('one');
		expect(result[1].d).to.equal('two');
	});

	it('does not allow a directive called hasOwnProperty', function () {
		var myModule = window.angular.module('myModule', []);
		myModule.directive('hasOwnProperty', function () {});
		expect(function () {
			createInjector(['ng', 'myModule']);
		}).to.throw;
	});

	it('allows creating directives with the object notation', function () {
		var myModule = window.angular.module('myModule', []);

		myModule.directive({
			a: function () {},
			b: function () {},
			c: function () {}
		});
		var injector = createInjector(['ng', 'myModule']);

		expect(injector.has('aDirective')).to.be.true;
		expect(injector.has('bDirective')).to.be.true;
		expect(injector.has('cDirective')).to.be.true;
	});

	it('compiles element directives from a single element', function () {
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});

		injector.invoke(function ($compile) {
			var el = $('<my-directive></my-directive>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles element directives found from several elements', function () {
		var idx = 1;
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', idx++);
				}
			};
		});

		injector.invoke(function ($compile) {
			var el = $('<my-directive></my-directive><my-directive></my-directive>');
			$compile(el);
			expect(el.eq(0).data('hasCompiled')).to.equal(1);
			expect(el.eq(1).data('hasCompiled')).to.equal(2);
		});
	});

	it('compiles element directives from child elements', function () {
		var idx = 1;
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', idx++);
				}
			};
		});

		injector.invoke(function ($compile) {
			var el = $('<div><my-directive></my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.undefined;
			expect(el.find('> my-directive').data('hasCompiled')).to.equal(1);
		});
	});

	it('compiles nested directives', function () {
		var idx = 1;
		var injector = makeInjectorWithDirectives('myDir', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', idx++);
				}
			};
		});

		injector.invoke(function ($compile) {
			var el = $('<my-dir><my-dir><my-dir /></my-dir></my-dir>');
			$compile(el);
			expect(el.data('hasCompiled')).to.equal(1);
			expect(el.find('> my-dir').data('hasCompiled')).to.equal(2);
			expect(el.find('> my-dir > my-dir').data('hasCompiled')).to.equal(3);
		});
	});

	_.forEach(['x', 'data'], function (prefix) {
		_.forEach([':', '-', '_'], function (delim) {
			it('compiles element directives with ' + prefix+delim + 'prefix', function () {
				var injector = makeInjectorWithDirectives('myDir', function () {
					return {
						restrict: 'EACM',
						compile: function (element) {
							element.data('hasCompiled', true);
						}
					};
				});
				injector.invoke(function ($compile) {
					var el = $('<'+prefix+delim+'my-dir></'+prefix+delim+'my-dir');
					$compile(el);
					expect(el.data('hasCompiled')).to.be.true;
				});
			})
		});
	});

	it('compiles directive attributes', function () {
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			var el = $('<div my-directive></div');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles attribute directives with prefixes', function () {
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function ($compile) {
			var el = $('<div x-my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles several attribute directives in an element', function () {
		var injector = makeInjectorWithDirectives({
			myDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});
		injector.invoke(function ($compile) {
			var el = $('<div my-directive my-second-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
			expect(el.data('secondCompiled')).to.be.true;
		});
	});

	it('compiles both element and attributes directives in an element', function () {
		var injector = makeInjectorWithDirectives({
			myDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function () {
				return {
					restrict: 'EACM',
					compile: function (element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});

		injector.invoke(function ($compile) {
			var el = $('<my-directive my-second-directive></my-directive>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
			expect(el.data('secondCompiled')).to.be.true;
		});
	});

	it('compiles attribute directives with ng-attr prefix', function () {
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}	
			};
		});
		injector.invoke(function ($compile) {
			var el = $('<div ng-attr-my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles attribute directives with data:ng-attr prefix', function () {
		var injector = makeInjectorWithDirectives('myDirective', function () {
			return {
				restrict: 'EACM',
				compile: function (element) {
					element.data('hasCompiled', true);
				}	
			};
		});
		injector.invoke(function ($compile) {
			var el = $('<div data:ng-attr-my-directive></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles class directives', function() {
		var injector = makeInjectorWithDirectives('myDirective', function() {
			return {
				restrict: 'EACM',
				compile: function(element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function($compile) {
			var el = $('<div class="my-directive"></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles several class directives in an element', function() {
		var injector = makeInjectorWithDirectives({
			myDirective: function() {
				return {
					restrict: 'EACM',
					compile: function(element) {
						element.data('hasCompiled', true);
					}
				};
			},
			mySecondDirective: function() {
				return {
					restrict: 'EACM',
					compile: function(element) {
						element.data('secondCompiled', true);
					}
				};
			}
		});
		injector.invoke(function($compile) {
		var el = $('<div class="my-directive my-second-directive"></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
			expect(el.data('secondCompiled')).to.be.true;
		});
	});

	it('compiles class directives with prefixes', function() {
		var injector = makeInjectorWithDirectives('myDirective', function() {
			return {
				restrict: 'EACM',
				compile: function(element) {
					element.data('hasCompiled', true);
				}
			};
		});
		injector.invoke(function($compile) {
			var el = $('<div class="x-my-directive"></div>');
			$compile(el);
			expect(el.data('hasCompiled')).to.be.true;
		});
	});

	it('compiles comment directives', function() {
		var hasCompiled;
		var injector = makeInjectorWithDirectives('myDirective', function() {
			return {
				restrict: 'EACM',
				compile: function(element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function($compile) {
			var el = $('<!-- directive: my-directive -->');
			$compile(el);
			expect(hasCompiled).to.be.true;
		});
	});

	_.forEach({
		E: {element: true, attribute: false, class: false, comment: false},
		A: {element: false, attribute: true, class: false, comment: false},
		C: {element: false, attribute: false, class: true, comment: false},
		M: {element: false, attribute: false, class: false, comment: true},
		EA: {element: true, attribute: true, class: false, comment: false},
		AC: {element: false, attribute: true, class: true, comment: false},
		EAM: {element: true, attribute: true, class: false, comment: true},
		EACM: {element: true, attribute: true, class: true, comment: true},
	}, function(expected, restrict) {
		describe('restricted to '+restrict, function() {
			
			_.forEach({
				element: '<my-directive></my-directive>',
				attribute: '<div my-directive></div>',
				class: '<div class="my-directive"></div>',
				comment: '<!-- directive: my-directive -->'
			}, function (dom, type) {

				it((expected[type] ? 'matches' : 'does not match') + ' on ' + type, function () {
					var hasCompiled = false;
					var injector = makeInjectorWithDirectives('myDirective', function () {
						return {
							restrict: restrict,
							compile: function (element) {
								hasCompiled = true;
							}
						};
					});
					injector.invoke(function ($compile) {
						var el = $(dom);
						$compile(el);
						expect(hasCompiled).to.equal(expected[type]);
					})
				});

			});
		});
	});
	it('applies to attributes when no restrict given', function () {
		var hasCompiled = false;
		var injector = makeInjectorWithDirectives('myDirective', function() {
			return {
				compile: function(element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function($compile) {
			var el = $('<div my-directive></div>');
			$compile(el);
			expect(hasCompiled).to.be.true;
		});
	});

	it('does not apply to elements when no restrict given', function() {
		var hasCompiled = false;
		var injector = makeInjectorWithDirectives('myDirective', function() {
			return {
				compile: function(element) {
					hasCompiled = true;
				}
			};
		});
		injector.invoke(function($compile) {
			var el = $('<my-directive></my-directive>');
			$compile(el);
			expect(hasCompiled).to.be.false;
		});
	});

	it('allows applying a directive to multiple elements', function() {
		var compileEl = false;
		var injector = makeInjectorWithDirectives('myDir', function() {
			return {
				compile: function(element) {
					compileEl = element;
				}
			};
		});
		injector.invoke(function($compile) {
			var el = $('<div my-dir-start></div><span></span><div my-dir-end></div>');
			$compile(el);
			expect(compileEl.length).to.equal(3);
		});
	});
});