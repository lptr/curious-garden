(function() {
	var printingOrdersModule = angular.module("kapa.printing.orders", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	printingOrdersModule.config(function($routeProvider) {
		$routeProvider
			.when('/printing/orders', {
				templateUrl: 'modules/printing/orders/module.html'
			});
	});

	printingOrdersModule.controller("OrderPrinterController", function ($scope, $filter, $templateRequest, $compile, $timeout, productManager, harvestEstimateManager, potentialHarvestManager) {
		$scope.products = null;
		$scope.estimates = null;
		$scope.potentialHarvests = null;

		$scope.$watch("date", function(date) {
			$scope.estimates = null;
			harvestEstimateManager.fetch(date).then(function (estimates) {
				estimates.forEach(function(estimate) {
					estimate.date = new Date(Date.parse(estimate.date));
				});
				$scope.estimates = estimates;
			});
		});

		var now = new Date();
		$scope.today = now;
		$scope.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		$scope.orders = [];

		console.log("Termékek betöltése... (amíg tölt, nem lehet matricát nyomtatni)");
		var productsFetched = productManager.fetch();
		productsFetched.then(function (products) {
			products.forEach(function (product) {
				var baseCategory;
				if (product.category.search(/Levelek/i) !== -1) {
					baseCategory = "Levelek";
				} else if (product.category.search(/Virágok/i) !== -1) {
					baseCategory = "Virágok";
				} else if (product.category.search(/Zöldségek/i) !== -1) {
					baseCategory = "Zöldségek";
				} else {
					baseCategory = "vmi más";
				}
				product.baseCategory = baseCategory;
			});
			$scope.products = _.indexBy(products, "sku");
			console.log("Termékek betöltve");
		});

		var potentialHarvestsFetched = potentialHarvestManager.fetch();
		potentialHarvestsFetched.then(function (potentialHarvests) {
			$scope.potentialHarvests = potentialHarvests;
		});

		$scope.printOrders = function() {
			if (!$scope.orders) {
				alert("Nincs betöltve beszerzési lista adat");
				return;
			}

			$scope.title = "Title, ho!";
			$templateRequest("modules/printing/orders/print-orders.html").then(function (template) {
				$timeout(function () {
					var linkFn = $compile(template);
					var linkedContent = linkFn($scope);
					$scope.$apply();
					var printContents = linkedContent.html();

					var printWindow = window.open("about:blank", "KAPA_PrintOrders", "width=800, height=600");
					if (!printWindow) {
						alert("Nem tudom megnyitni a nyomtatási ablakot");
						return;
					}

					printWindow.document.open();
					printWindow.document.write(
						'<!doctype html><html><head>'
						+ '<meta charset="utf-8"/>'
						+ '<link rel="stylesheet" type="text/css" href="modules/printing/print-orders.css" />'
						+ '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" />'
						+ '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap-theme.min.css" />'
						+ '</head><body>' + printContents + '</body></html>'
					);

					$(printWindow).load(function () {
						printWindow.focus();
						printWindow.print();
					});
				}, 0);
			});
		};
		$scope.filePicked = function(element) {
			var file = element.files[0];
			console.log("Beszerzési lista betöltése megkezdve: " + file.name);
			var reader = new FileReader();
			reader.onload = function(event) {
				// Parse CSV
				CSV.COLUMN_SEPARATOR = ";";
				var data = CSV.parse(reader.result);
				console.log("Raw CSV data:", data);

				// Get the column indexes
				var columns = {};
				data.shift().forEach(function (column, index) {
					columns[column] = index;
				});

				var numberOfOrders = data.length;
				var numberOfMissingProducts = 0;

				$scope.mins = mins = function (minutes) {
					var min = Math.abs(minutes) % 60;
					var hrs = Math.floor(minutes / 60);

					var result = "";
					if (Math.abs(hrs) < 10) {
						if (hrs < 0) {
							result += "-";
						}
						result += "0";
					}
					result += Math.abs(hrs);
					result += ":";
					if (min < 10) {
						result += "0";
					}
					result += min;
					return result;
				}

				$scope.$apply (function() {
					$scope.orders = null;

					var orders = [];
					var previousOrder = {};
					data.forEach(function (row) {
						// "Cikkszám";"Név";"Darabszám";"Nettó ár";"Bruttó ár";"Gyártó";"Rendelés azonosító(k)"
						// "16";"beet leaves, XS, small box";"4";"600";"762";"";"1639(Delivery), 1640(Delivery)"

						var sku = row[columns["Cikkszám"]];
						var product = $scope.products[sku];
						if (!product) {
							console.log("Ez a cikkszám nem szerepel a KAPA-ban: " + sku + " (" + row[columns["Név"]] + ")");
							numberOfMissingProducts++;
							return;
						}

						var count = row[columns["Darabszám"]];
						var netPrice = row[columns["Nettó ár"]];
						var grossPrice = row[columns["Bruttó ár"]];
						var orderIds = row[columns["Rendelés azonosító(k)"]].split(", ");

						var plots = $scope.estimates.filter(function (estimate) {
							return estimate.product == product.name;
						}).map(function (estimate) {
							return estimate.plot;
						}).sort().join(", ");

						var potentialPlots = $scope.potentialHarvests.filter(function (harvest) {
							return harvest.produce == product.produce;
						}).map(function (harvest) {
							return harvest.plot;
						}).sort().join(", ");

						var harvestTime;
						if (product.baseCategory !== "Levelek") {
							harvestTime = count * 10;
						} else {
							harvestTime = count * 2;
						}
						// Time to move between plots
						harvestTime += 4;

						var order = {
							product: product,
							count: count,
							netValue: netPrice * count,
							plots: plots,
							potentialPlots: potentialPlots,
							harvestTime: harvestTime
						};
						console.log("Found:", product, order);
						orders.push(order);
						previousOrder = order;
					});

					if (numberOfMissingProducts) {
						console.log("Összesen " + numberOfMissingProducts + " termék nem szerepelt a KAPA-ban");
					}

					var sumNetValue = 0;
					var sumUnits = 0;

					// All times are in minutes
					var sumHarvestTime = 0;
					var dailyCleanupTime = 30;
					var dailyMeetingTime = 30;

					orders.forEach(function (order) {
						sumNetValue += order.netValue;
						sumUnits += order.count;
						sumHarvestTime += order.harvestTime;
					});

					var sumWashingTime = sumUnits * 1;
					var sumLabelingTime = Math.round(sumUnits * 0.5);

					var remainingTimeInDay = 8 * 60 - (sumHarvestTime + sumWashingTime + sumLabelingTime + dailyCleanupTime + dailyMeetingTime);

					orders.sort(function (a, b) {
						var result = a.product.baseCategory.localeCompare(b.product.baseCategory);
						if (!result) {
							result = a.plots.localeCompare(b.plots);
							if (!result) {
								result = a.product.name.localeCompare(b.product.name);
							}
						}
						return result;
					});

					$scope.notes = [
						{
							name: "Szüretösszeírás dátuma",
							value: $filter("date")($scope.date, "EEEE, MMM d, y")
						},
						{
							name: "Napi nettó rendelés összesen",
							value: sumNetValue.toLocaleString() + " Ft"
						},{
							name: "Összesen szüretelendő egységek",
							value: sumUnits.toLocaleString() + " egység"
						},{
							name: "Össz várható szedési idő (óra:perc)",
							value: mins(sumHarvestTime)
						},{
							name: "Össz várható mosási idő (óra:perc)",
							value: mins(sumWashingTime)
						},{
							name: "Össz várható matricázási idő (óra:perc)",
							value: mins(sumLabelingTime)
						},{
							name: "Rendrakás (óra:perc)",
							value: mins(dailyCleanupTime)
						},{
							name: "Napi megbeszélés (óra:perc)",
							value: mins(dailyMeetingTime)
						},{
							name: "Más feladatokra idő (óra:perc)",
							value: mins(remainingTimeInDay)
						},
					];
					$scope.orders = orders;
				});
			};
			reader.readAsText(file, "iso-8859-2");
		}
	});

})();
