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

	harvestModule.controller("HarvestController", function ($scope, $modal, $filter, kapaServer, produceManager, productManager) {
		$scope.date = new Date();

		produceManager.load(function (produces) {
			$scope.produces = _.indexBy(produces, "name");
			processProducts();
			processHarvests();
		});
		productManager.load(function (products) {
			$scope.unprocessedProducts = products;
			processProducts();
		});
		var processProducts = function () {
			if (!$scope.produces || !$scope.unprocessedProducts) {
				return;
			}
			$scope.products = $scope.unprocessedProducts.map(function (product) {
				var produce = $scope.produces[product.produce];
				if (produce) {
					product.species = produce.species;
				}
				return product;
			});
		};
		$scope.unprocessedHarvests = [
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
		var processHarvests = function () {
			if (!$scope.produces || !$scope.unprocessedHarvests) {
				return;
			}
			$scope.harvests = $scope.unprocessedHarvests.map(function (harvest) {
				var produce = $scope.produces[harvest.produce];
				if (produce) {
					harvest.species = produce.species;
				}
				return harvest;
			});
			$scope.locations = _.uniq($scope.harvests.map(function (harvest) {
				return harvest.location;
			}));
		};
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
