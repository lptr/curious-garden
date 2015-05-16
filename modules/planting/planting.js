(function () {
	var transactionModule = angular.module("kapa.planting", [
		"kapa.services",
		"ngRoute",
		"ngHandsontable",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/planting', {
				templateUrl: 'modules/planting/planting.html',
				controller: 'plantingController'
			});
	});

	transactionModule.controller("plantingController", function ($scope, kapaServer) {
		$scope.items = [
			{ id: 1, name: "Zsázsa", color: "Blue" },
			{ id: 2, name: "Mizuna", color: "Zöld" },
		];
	});
})();
