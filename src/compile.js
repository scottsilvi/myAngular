/*jshint globalstrict: true*/
'use strict';
var _ = require('lodash');
var $ = require('jquery');
var PREFIX_REGEXP = /(x[\:\-_]|data[\:\-_])/i;

function nodeName (element) {
	return element.nodeName ? element.nodeName : element[0].nodeName;
}

function directiveNormalize (name) {
	return _.camelCase(name.replace(PREFIX_REGEXP, ''));
}

function $CompileProvider ($provide) {

	var hasDirectives = {};

	this.directive = function (name, directiveFactory) {
		if(_.isString(name)) {
			if (name === 'hasOwnProperty') {
				throw 'hasOwnProperty is not a valid directive name';
			}
			if (!hasDirectives.hasOwnProperty(name)) {
				hasDirectives[name] = [];
				$provide.factory(name + 'Directive', ['$injector', function ($injector) {
					var factories = hasDirectives[name];
					return _.map(factories, function (factory) {
						var directive = $injector.invoke(factory);
						directive.restrict = directive.restrict || 'A';
						return directive;
					});
				}]);
			}
			hasDirectives[name].push(directiveFactory);
		} else {
			_.forEach(name, function (directiveFactory, name) {
				this.directive(name, directiveFactory);
			}, this);
		}
		
	};

	this.$get = ['$injector', function ($injector) {

		function compile ($compileNodes) {
			return compileNodes($compileNodes);
		}

		function compileNodes ($compileNodes) {
			_.forEach($compileNodes, function (node) {
				var directives = collectDirectives(node);
				applyDirectivesToNode(directives, node);
				if (node.childNodes && node.childNodes.length) {
					compileNodes(node.childNodes);
				}
			});
		}

		function collectDirectives (node) {
			var directives = [];
			if (node.nodeType === Node.ELEMENT_NODE) {
				var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
				addDirective(directives, normalizedNodeName, 'E');
				_.forEach(node.attributes, function (attr) {
					var attrStartName, attrEndName;
					var name = attr.name;
					var normalizedAttr = directiveNormalize(name.toLowerCase());
					if (/^ngAttr[A-Z]/.test(normalizedAttr)) {
						name = _.snakeCase(
							normalizedAttr[6].toLowerCase() + 
							normalizedAttr.substring(7),
							'-'
						);
					}
					if (/Start$/.test(normalizedAttr)) {
						attrStartName = name;
						attrEndName = name.substring(0, name.length - 5) + 'end';
						name = name.substring(0, name.length - 6);
					}
					normalizedAttr = directiveNormalize(name.toLowerCase());
					addDirective(directives, normalizedAttr, 'A', attrStartName, attrEndName);
				});
				_.forEach(node.classList, function (cls) {
					var normalizedClassName = directiveNormalize(cls);
					addDirective(directives, normalizedClassName, 'C');
				})
			} else if (node.nodeType === Node.COMMENT_NODE) {
				var match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
				if (match) {
					addDirective(directives, directiveNormalize(match[1]), 'M');
				}
			}
			return directives;
		}

		function addDirective (directives, name, mode, attrStartName, attrEndName) {
			if (hasDirectives.hasOwnProperty(name)) {
				var foundDirectives = $injector.get(name + 'Directive');
				var applicableDirectives = _.filter(foundDirectives, function (dir) {
					return dir.restrict.indexOf(mode) !== -1;
				});
				_.forEach(applicableDirectives, function (directive) {
					if (attrStartName) {
						directive = _.create(directive, {
							$$start: attrStartName,
							$$end: attrEndName
						});
					}
					directives.push(directive);
				});
			}
		}

		function applyDirectivesToNode(directives, compileNode) {
			var $compileNode = $(compileNode);
			_.forEach(directives, function (directive) {
				if(directive.$$start) {
					$compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
				}
				if (directive.compile) {
					directive.compile($compileNode);
				}
			});
		}

		function groupScan (node, startAttr, endAttr) {
			var nodes = [];
			if (startAttr && node.hasAttribute(startAttr)) {
				var depth = 0;
				do {
					if (node.nodeType === Node.ELEMENT_NODE) {
						if (node.hasAttribute(startAttr)) {
							depth++;
						} else if (node.hasAttribute(endAttr)) {
							depth--;
						}
					}
					nodes.push(node);
					node = node.nextSibling;
				} while (depth > 0);
			} else {
				nodes.push(node);
			}
			console.log(nodes.length);
			return $(nodes);
		}

		return compile;
	}];

}

$CompileProvider.$inject = ['$provide'];

module.exports = $CompileProvider;