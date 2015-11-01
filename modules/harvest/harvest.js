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

	harvestModule.controller("HarvestController", function ($scope, $modal, $filter, kapaServer, produceManager, productManager, harvestManager, harvestEstimateManager) {
		var now = new Date();
		produceManager.load(function (produces) {
			$scope.produces = _.indexBy(produces, "name");
			processProducts();
			processHarvests();
		});
		harvestManager.load(function (harvests) {
			$scope.unprocessedHarvests = harvests;
			processHarvests();
		});
		productManager.load(function (products) {
			$scope.unprocessedProducts = products;
			processProducts();
		});
		$scope.$watch("date", function(date) {
			$scope.storedEstimates = null;
			harvestEstimateManager.load(function (storedEstimates) {
				$scope.storedEstimates = {};
				storedEstimates.forEach(function(estimate) {
					estimate.date = new Date(Date.parse(estimate.date));
					var estimatesForId = $scope.storedEstimates[estimate.id];
					if (!estimatesForId) {
						estimatesForId = [];
						$scope.storedEstimates[estimate.id] = estimatesForId;
					}
					estimatesForId.push(estimate);
				});
			}, date);
		});
		$scope.$watch("harvest", function (harvest) {
			if (!harvest) {
				$scope.estimates = null;
			} else {
				var storedEstimates = $scope.storedEstimates[harvest.id];
				if (storedEstimates) {
					$scope.estimates = storedEstimates.map(function (estimate) {
						return {
							product: $scope.productsByName[estimate.product],
							quantity: estimate.quantity
						}
					});
				} else {
					$scope.estimates = [{}];
				}
			}
		});
		$scope.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
			$scope.productsByName = _.indexBy($scope.products, "name");
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
		$scope.locationStatus = function (location) {
			if (!$scope.storedEstimates || !$scope.harvests) {
				return " ";
			}
			if (!$scope.harvests.filter(function (harvest) {
					return harvest.location == location;
				}).find(function (harvest) {
					return !$scope.storedEstimates[harvest.id];
				})) {
				return "✅";
			} else {
				return "❓";
			}
		}
		$scope.harvestStatus = function (id) {
			if ($scope.storedEstimates && $scope.storedEstimates[id]) {
				return "✅";
			} else {
				return "❓";
			}
		}
		$scope.sumIncome = function () {
			var income = 0;
			if ($scope.estimates) {
				$scope.estimates.forEach(function (estimate) {
					if (estimate.product && estimate.product.price && estimate.quantity) {
						income += estimate.product.price * estimate.quantity;
					}
				});
			}
			return income;
		};
		$scope.reset = function () {
			$scope.harvest = null;
			$scope.estimates = null;
			$scope.memo = null;
			$scope.$broadcast('show-errors-reset');
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

			var popup = $modal.open({
				templateUrl: "save-dialog.html"
			});

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
				$scope.storedEstimates[$scope.harvest.id] = estimates.map(function (estimate) {
					return {
						date: $scope.date,
						plot: $scope.harvest.plot,
						id: $scope.harvest.id,
						product: estimate.product,
						quantity: estimate.quantity,
						unit: estimate.unit,
						memo: $scope.memo
					};
				});
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		};
		$scope.reset();
	});
})();
