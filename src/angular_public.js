var setupModuleLoader = require('./loader');
var $ParseProvider = require('./parse');
var $RootScopeProvider = require('./scope');
var $CompileProvider = require('./compile');

function publishExternalAPI() {
	'use strict';

	setupModuleLoader(window);

	var ngModule = angular.module('ng', []);
	ngModule.provider('$parse', $ParseProvider);
	ngModule.provider('$rootScope', $RootScopeProvider);
	ngModule.provider('$compile', $CompileProvider);
}

module.exports = publishExternalAPI;