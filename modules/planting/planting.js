(function () {
	var plantingModule = angular.module("kapa.planting", [
		"kapa.services",
		"kapa.utils.tables",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	plantingModule.config(function ($routeProvider) {
		$routeProvider
			.when('/planting', {
				templateUrl: 'modules/planting/planting.html',
				controller: 'PlantingController'
			});
	});

	plantingModule.controller("PlantingController", function ($scope, $q, kapaServer, normalizer, plotManager, produceManager, seedManager) {
		$scope.find = normalizer.find;
		$scope.units = ["négyzet", "szapláda", "sor", "sáv", "ágyás"];
		plotManager.fetch().then(function (plots) {
			var locations = {};
			plots.forEach(function (plot) {
				var location = locations[plot.location];
				if (!location) {
					location = {
						name: plot.location,
						plots: []
					};
					locations[plot.location] = location;
				}
				location.plots.push(plot.id);
			});
			$scope.locations = _.values(locations);
		});
		produceManager.fetch().then(function (produces) {
			$scope.produces = produces;
		});
		seedManager.fetch().then(function (seeds) {
			$scope.seeds = seeds;
		});
		var now = new Date();
		$scope.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		$scope.reset = function () {
			$scope.id = null;
			$scope.produce = null;
			$scope.quantity = null;
			$scope.unit = null;
			$scope.location = null;
			$scope.plot = null;
			$scope.experiment = null;
			$scope.parameter = null;
			$scope.resetSecondary();
		};
		$scope.resetSecondary = function () {
			$scope.seed = null;
			$scope.basket = null;
		};
		$scope.reset();
		$scope.submit = function () {

		};
	});
})();
