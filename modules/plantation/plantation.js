(function () {
	var transactionModule = angular.module("kapa.plantation", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/plantation', {
				templateUrl: 'modules/plantation/plantation.html',
				controller: 'PlantationsController'
			});
	});

	transactionModule.controller("PlantationsController", function ($scope) {
	});
})();
