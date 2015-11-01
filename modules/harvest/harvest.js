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

	harvestModule.controller("HarvestController", function ($scope, $modal, $filter, kapaServer, produceManager, productManager, harvestManager) {
		var now = new Date();
		$scope.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		produceManager.load(function (produces) {
			$scope.produces = _.indexBy(produces, "name");
			processProducts();
			processHarvests();
		});
		productManager.load(function (products) {
			$scope.unprocessedProducts = products;
			processProducts();
		});
		harvestManager.load(function (harvests) {
			$scope.unprocessedHarvests = harvests;
			processHarvests();
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

		$scope.add = function () {
			$scope.estimates.push({});
		};
		$scope.remove = function (index) {
			$scope.estimates.splice(index, 1);
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
		$scope.reset = function () {
			$scope.location = null;
			$scope.harvest = null;
			$scope.estimates = [{}];
			$scope.memo = null;
		};
		$scope.submit = function () {
			if ($scope.harvestEstimates.$invalid) {
				$modal.open({
					templateUrl: "error-dialog.html",
					controller: function ($scope, $modalInstance) {
						$scope.close = function () {
							$modalInstance.dismiss("close");
						}
					}
				});
				return;
			}

			var estimates = $scope.estimates.map(function (estimate) {
				return {
					product: estimate.product.name,
					quantity: estimate.quantity,
					unit: estimate.product.unit
				};
			});

			var formData = {
				date: $scope.date,
				plot: $scope.harvest.plot,
				id: $scope.harvest.id,
				estimates: estimates,
				memo: $scope.memo
			};

			kapaServer.query("submitHarvestEstimates", formData).success(function (id) {
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		};
		$scope.reset();
	});
})();
