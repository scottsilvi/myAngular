var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('angularPublic', function () {
	'use strict';

	it('sets up the angular object and the module loader', function () {
		publishExternalAPI();

		expect(window.angular).to.be.defined;
		expect(window.angular.module).to.be.defined;
	});

	it('sets up the ng module', function () {
		publishExternalAPI();

		expect(createInjector(['ng'])).to.be.defined;
	});

	it('sets up the $parse service', function () {
		publishExternalAPI();

		var injector = createInjector(['ng']);
		expect(injector.has('$parse')).to.be.true;
	});

	it('sets up the $rootScope', function () {
		publishExternalAPI();

		var injector = createInjector(['ng']);
		expect(injector.has('$rootScope')).to.be.true;
	});

	it('sets up $compile', function () {
		publishExternalAPI();
		var injector = createInjector(['ng']);
		expect(injector.has('$compile')).to.be.true;
	});
});