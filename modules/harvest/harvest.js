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

	harvestModule.controller("HarvestController", function ($scope, $uibModal, $filter, $q, kapaServer, produceManager, productManager, harvestManager, harvestEstimateManager) {
		var chooseFirstNotDoneHarvest = function (startIndex) {
			var harvest = findFirstNotDoneHarvest(startIndex);

			$scope.reset();
			if (harvest) {
				$scope.location = $scope.locations.find(function (location) {
					return location.name == harvest.location;
				});
			}
		};
		var findFirstNotDoneHarvest = function (startIndex) {
			if (!$scope.harvests || !$scope.storedEstimates) {
				return;
			}

			return $scope.harvests.find(function (harvest) {
				return harvest.index >= startIndex && !isHarvestDone(harvest);
			});
		};
		var isHarvestDone = function (harvest) {
			return $scope.storedEstimates[harvest.id];
		};

		var producesFetched = produceManager.fetch().then(function (produces) {
			return _.indexBy(produces, "name");
		});
		var harvestsFetched = harvestManager.fetch();
		var productsFetched = productManager.fetch();

		var productsReady = $q.all({
			produces: producesFetched,
			products: productsFetched
		}).then(function (fetched) {
			$scope.products = fetched.products.map(function (product) {
				var produce = fetched.produces[product.produce];
				if (produce) {
					product.species = produce.species;
				}
				return product;
			});
			$scope.productsByName = _.indexBy($scope.products, "name");			
		});

		var harvestsReady = $q.all({
			produces: producesFetched,
			harvests: harvestsFetched
		}).then(function (fetched) {
			$scope.harvests = fetched.harvests.map(function (harvest, index) {
				harvest.index = index;
				var produce = fetched.produces[harvest.produce];
				if (produce) {
					harvest.species = produce.species;
				}
				return harvest;
			});
			var locationsByName = {};
			$scope.locations = [];
			$scope.harvests.forEach(function (harvest) {
				var location = locationsByName[harvest.location];
				var plots;
				if (!location) {
					var plots = [];
					location = {
						name: harvest.location,
						plots: plots
					}
					$scope.locations.push(location);
					locationsByName[harvest.location] = location;
				} else {
					plots = location.plots;
				}
				if (plots.indexOf(harvest.plot) === -1) {
					plots.push(harvest.plot);
				}
			});
		});

		$q.all([productsReady, harvestsReady])
			.then(function () {
				chooseFirstNotDoneHarvest(0);
			})
			.catch(function (error) {
				alert("Error: " + error);
			});

		$scope.$watch("date", function(date) {
			$scope.storedEstimates = null;
			$scope.storedCount = 0;
			harvestEstimateManager.fetch(date).then(function (storedEstimates) {
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
				$scope.storedCount = Object.keys($scope.storedEstimates).length;
				chooseFirstNotDoneHarvest();
			});
		});
		var nextHarvest = false;
		$scope.$watch("location", function (location) {
			if (nextHarvest || !location || !$scope.harvests) {
				return;
			}
			var harvest = $scope.harvests.find(function (harvest) {
				return !isHarvestDone(harvest) && location.plots.some(function (plot) {
					return harvest.plot == plot;
				});
			});
			if (harvest) {
				$scope.plot = harvest.plot;
			}
		});
		$scope.$watch("plot", function (plot) {
			if (nextHarvest || !plot || !$scope.harvests) {
				return;
			}
			$scope.harvest = $scope.harvests.find(function (harvest) {
				return !isHarvestDone(harvest) && harvest.plot == plot;
			});
		});
		$scope.$watch("harvest", function (harvest) {
			if (!harvest) {
				$scope.estimates = null;
				if (nextHarvest) {
					$scope.reset();	
				}
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
					var estimates = [{}];
					if ($scope.products) {
						estimates = [{
							product: $scope.products.find(function (product) {
								return product.produce === harvest.produce;
							})
						}];
					}
					$scope.estimates = estimates;
				}
				if (nextHarvest) {
					$scope.location = $scope.locations.find(function (location) {
						return harvest.location == location.name;
					});
					$scope.plot = harvest.plot;
				}
			}
		});

		var now = new Date();
		$scope.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		$scope.add = function () {
			$scope.estimates.push({});
		};
		$scope.remove = function (index) {
			$scope.estimates.splice(index, 1);
		}
		$scope.matchingHarvests = function() {
			if (!$scope.harvests || !$scope.plot) {
				return [];
			}
			return $scope.harvests.filter(function (harvest) {
				return harvest.plot == $scope.plot;
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
		var status = function (items) {
			var foundDone = false;
			var foundNotDone = false;
			items.forEach(function (item) {
				if ($scope.storedEstimates[item.id]) {
					foundDone = true;
				} else {
					foundNotDone = true;
				}
			});
			if (!foundNotDone) {
				return "✅";
			} else if (!foundDone) {
				return "❗️";
			} else if (foundDone) {
				return "🔶";
			}
		};
		$scope.locationStatus = function (location) {
			if (!$scope.storedEstimates || !$scope.harvests) {
				return " ";
			}
			return status($scope.harvests.filter(function (harvest) {
				return harvest.location == location;
			}));
		};
		$scope.plotStatus = function (plot) {
			if (!$scope.storedEstimates || !$scope.harvests) {
				return " ";
			}
			return status($scope.harvests.filter(function (harvest) {
				return harvest.plot == plot;
			}));
		};
		$scope.harvestStatus = function (id) {
			if ($scope.storedEstimates && $scope.storedEstimates[id]) {
				return "✅";
			} else {
				return "❗️";
			}
		};
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

		var submitData = function(data, success) {
			if (!data || !data.harvests) {
				return;
			}

			var popup = $uibModal.open({
				templateUrl: "save-dialog.html"
			});
			kapaServer.query("submitHarvestEstimates", data).success(function (result) {
				// Remove previously recorded estimates for harvest
				result.recordsAdded.forEach(function (estimate) {
					$scope.storedEstimates[estimate.id] = [];
				});
				// Record newly added estimates for harvest
				result.recordsAdded.forEach(function (estimate) {
					$scope.storedEstimates[estimate.id].push(estimate);
				});
				$scope.storedCount = result.recordCount;

				var finishedHarvest = $scope.harvest;
				$scope.reset();

				if (finishedHarvest) {
					nextHarvest = true;
					try {
						var harvest = findFirstNotDoneHarvest(finishedHarvest.index + 1);
						if (harvest) {
							$scope.location = $scope.locations.find(function (location) {
								return location.name == finishedHarvest.location;
							});
							$scope.plot = harvest.plot;
						}
						$scope.harvest = harvest;
					} finally {
						nextHarvest = false;
					}
				}
			}).finally(function () {
				popup.close();
			});
		};

		$scope.submit = function () {
			if ($scope.harvestEstimates.$invalid) {
				$uibModal.open({
					templateUrl: "error-dialog.html",
					controller: function ($scope, $uibModalInstance) {
						$scope.close = function () {
							$uibModalInstance.dismiss("close");
						}
					}
				});
				return;
			}

			var finishedHarvest = $scope.harvest;
			var estimates = $scope.estimates.map(function (estimate) {
				return {
					product: estimate.product.name,
					quantity: estimate.quantity,
					unit: estimate.product.unit
				};
			});

			var data = {
				date: $scope.date,
				harvests: [{
					plot: finishedHarvest.plot,
					id: finishedHarvest.id,
					estimates: estimates,
					memo: $scope.memo
				}]
			};

			submitData(data);
		};
		$scope.isPlotDone = function (plot) {
			return $scope.harvests.filter(function (harvest) {
				return harvest.plot == plot;
			}).every(isHarvestDone);
		};
		$scope.closePlot = function () {
			if (!$scope.plot) {
				return;
			}

			var harvestsInPlot = $scope.harvests.filter(function (harvest) {
				return harvest.plot == $scope.plot && !isHarvestDone(harvest);
			});

			if (harvestsInPlot.length === 0) {
				return;
			}

			$uibModal.open({
				templateUrl: "close-plot-dialog.html",
				controller: function ($scope, $uibModalInstance) {
					$scope.harvests = harvestsInPlot;
					$scope.ok = function () {
						$uibModalInstance.close();
					};
					$scope.cancel = function () {
						$uibModalInstance.dismiss("cancel");
					};
				}
			}).result.then(function () {
				var harvests = harvestsInPlot.map(function (harvest) {
					return {
						plot: harvest.plot,
						id: harvest.id,
						estimates: [{
							product: null,
							quantity: 0,
							unit: null
						}],
						memo: "jelenleg nem szüretelhető"
					};
				});

				var data = {
					date: $scope.date,
					harvests: harvests
				};
				submitData(data);
			});
		};
		$scope.reset();
	});
})();
