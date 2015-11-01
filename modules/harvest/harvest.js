(function () {
	var harvestModule = angular.module("kapa.harvest", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);
	harvestModule.config(function ($routeProvider) {
		$routeProvider
			.when('/harvest', {
				templateUrl: 'modules/harvest/harvest.html',
				controller: 'HarvestController'
			});
	});

	harvestModule.controller("HarvestController", function ($scope, $modal, $filter, kapaServer) {
		$scope.date = new Date();
		$scope.produces = [
			{
				name: "búzavirág, S",
				species: "búzavirág"
			},
			{
				name: "búzavirág, XS",
				species: "búzavirág"
			},
			{
				name: "tomatillo",
				species: "tomatillo"
			}
		];
		$scope.producesIndex = _.indexBy($scope.produces, 'name');
		$scope.products = [
			{
				name: "búzavirág, XS, kis doboz",
				produce: "búzavirág, XS",
				unit: "kd"
			},
			{
				name: "búzavirág, XS, nagy doboz",
				produce: "búzavirág, XS",
				unit: "nd"
			},
			{
				name: "búzavirág, S, kis doboz",
				produce: "búzavirág, S",
				unit: "kd"
			},
			{
				name: "búzavirág, S, nagy doboz",
				produce: "búzavirág, S",
				unit: "nd"
			},
			{
				name: "chili, csípős, kis doboz",
				produce: "chili, csípős",
				unit: "kd"
			},
			{
				name: "tomatillo, 200 gramm",
				produce: "tomatillo",
				unit: "200 g"
			},
		];
		$scope.harvests = [
			{
				location: "fólia",
				plot: 5,
				id: 2999,
				produce: "búzavirág, XS",
				planted: new Date(0),
				state: "szüretlesős"
			},
			{
				location: "fólia",
				plot: 33,
				id: 1713,
				produce: "tomatillo",
				planted: new Date(0),
				state: "halálszüret piac"
			},
		];

		$scope.products.forEach(function (product) {
			var produce = $scope.producesIndex[product.produce];
			if (produce) {
				product.species = produce.species;
			}
		});
		$scope.harvests.forEach(function (harvest) {
			var produce = $scope.producesIndex[harvest.produce];
			if (produce) {
				harvest.species = produce.species;
			}
		});

		$scope.locations = _.uniq($scope.harvests.map(function (harvest) {
			return harvest.location;
		}));
		$scope.results = [{}];
		$scope.addResult = function () {
			$scope.results.push({});
		};
		$scope.removeResult = function (index) {
			$scope.results.splice(index, 1);
		}
		$scope.matchingHarvests = function() {
			if (!$scope.harvests || !$scope.location) {
				return [];
			}
			return $scope.harvests.filter(function (harvest) {
				return harvest.location == $scope.location;
			});
		};
		$scope.matchingProducts = function() {
			if (!$scope.harvest || !$scope.products) {
				return [];
			}
			return $scope.products.filter(function (product) {
				return product.species == $scope.harvest.species;
			});
		};
	});
})();
