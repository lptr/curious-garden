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
		$scope.products = [
			{
				name: "búzavirág, színmix, kis doboz",
				produce: "búzavirág, színmix",
				unit: "kd"
			},
			{
				name: "búzavirág, színmix, nagy doboz",
				produce: "búzavirág, színmix",
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
				produce: "búzavirág, színmix",
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
		$scope.locations = _.uniq($scope.harvests.map(function (harvest) {
			return harvest.location;
		}));
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
				return product.produce == $scope.harvest.produce;
			});
		};
	});
})();
