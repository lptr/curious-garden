(function() {
	var printingModule = angular.module("kapa.printing", [
			"kapa.services",
			"ngRoute",
			"ui.bootstrap",
			"ui.bootstrap.showErrors"
		]);

	printingModule.config(function($routeProvider) {
		$routeProvider
			.when('/printing', {
				templateUrl: 'modules/printing/printing.html'
			});
	});

	printingModule.factory("log", function ($filter) {
		return function (message) {
			var printingLog = $("#printingLog");
			var logMessage = "";
			// logMessage += $filter("date")(new Date(), "yyyy-MM-dd HH:MM:ss") + ": ";
			logMessage += message;
			logMessage += "\n" + printingLog.text();
			printingLog.text(logMessage);
		};
	});

	printingModule.controller("BrowserController", function ($scope) {
		$scope.notChrome = navigator.userAgent.indexOf('Chrome/') == -1;
	});

	var property = function (property) {
		return function (object) {
			return object[property];
		};
	};

	printingModule.controller("LabelPrinterController", function ($scope, $filter, productManager, log) {
		$scope.products = null;
		$scope.labels = [];

		log("Termékek betöltése... (amíg tölt, nem lehet matricát nyomtatni)");
		var productsFetched = productManager.fetch();
		productsFetched.then(function (products) {
			$scope.products = {};
			products.forEach(function (product) {
				$scope.products[product.sku] = {
					hu: product.name,
					en: product.englishName
				}
			});
			log("Termékek betöltve");
		});
		productsFetched.then(function () {
			$scope.loaded = true;
		});

		$scope.printLabels = function() {
			if (!$scope.labels) {
				alert("Nincs betöltve matrica adat");
				return;
			}

			var printWindow = window.open("modules/printing/print-labels.html", "KAPA_PrintLabels", "width=800, height=600");
			if (!printWindow) {
				alert("Nem tudom megnyitni a nyomtatási ablakot");
				return;
			}

			$(printWindow).load(function () {
				var printBody = $(printWindow.document).contents().find("body");
				printBody.empty();
				$scope.labels.forEach(function (label) {
					var labelDiv = $('<div class="label"></div>');
					labelDiv.append('<div class="customer">' + label.customer + '</div>');
					labelDiv.append('<div class="hu">' + label.hu + '</div>');
					labelDiv.append('<div class="en">' + label.en + '</div>');
					labelDiv.append('<div class="date">' + label.date + '</div>');
					printBody.append(labelDiv);
				});
				printWindow.focus();
				printWindow.print();
			});

		}
		$scope.filePicked = function(element) {
			var file = element.files[0];
			log("Matricák betöltése megkezdve: " + file.name);
			var date = $filter("date")(new Date(), "yyyy-MM-dd");
			var reader = new FileReader();
			reader.onload = function(event) {
				// Parse CSV
				CSV.COLUMN_SEPARATOR = ",";
				var data = CSV.parse(reader.result);
				console.log("Raw CSV data:", data);

				// Get the column indexes
				var columns = {};
				data.shift().forEach(function (column, index) {
					columns[column] = index;
				});

				var numberOfProducts = data.length;
				var numberOfMissingProducts = 0;

				$scope.$apply (function() {
					$scope.labels = [];
					while (data.length > 0) {
						var row = data.shift();
						var customer = row[columns["Ügyfél neve"]];
						var productSKU = row[columns["Termék cikkszáma"]];
						var productNameHU;
						var productNameEN;
						var product = $scope.products[productSKU];
						if (!product) {
							log("Ez a cikkszám nem szerepel a KAPA-ban: " + productSKU + " (" + row[coluns["Termék neve"]] + ")");
							numberOfMissingProducts++;
							continue;
						}
						productNameEN = product.en;
						productNameHU = product.hu;

						var count = row[columns["Termék mennyisége"]];
						for (var idx = 0; idx < count; idx++) {
							$scope.labels.push({
								customer: customer,
								en: productNameEN,
								hu: productNameHU,
								date: date
							});
						}
					}
					$scope.labels.sort(function (a, b) {
						return a.hu.localeCompare(b.hu, "hu");
					});
					log("Matricák adatai betöltve, összesen " + numberOfProducts + " termék, " + $scope.labels.length + " matrica");
					if (numberOfMissingProducts) {
						log("Összesen " + numberOfMissingProducts + " termék nem szerepelt a KAPA-ban, ezekhez nem nyomtatunk matricát");
					}
				});
			};
			reader.readAsText(file, "utf-8");
		}
	});

	printingModule.controller("OrderPrinterController", function ($scope, $filter, $templateCache, $templateRequest, $compile, $timeout, productManager, harvestEstimateManager, log) {
		$scope.products = null;
		$scope.estimates = null;

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
		$scope.date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		$scope.orders = [];

		log("Termékek betöltése... (amíg tölt, nem lehet matricát nyomtatni)");
		var productsFetched = productManager.fetch();
		productsFetched.then(function (products) {
			products.forEach(function (product) {
				var baseCategory;
				if (product.category.search(/Levelek/i) !== -1) {
					baseCategory = "Levelek";
				} else if (product.category.search(/Virágok/i) !== -1) {
					baseCategory = "Ehető virágok";
				} else if (product.category.search(/Zöldségek/i) !== -1) {
					baseCategory = "Zöldségek";
				} else {
					baseCategory = "vmi más";
				}
				product.baseCategory = baseCategory;
			});
			$scope.products = _.indexBy(products, "sku");
			log("Termékek betöltve");
		});

		$scope.printOrders = function() {
			if (!$scope.orders) {
				alert("Nincs betöltve beszerzési lista adat");
				return;
			}

			$scope.title = "Title, ho!";
			$templateRequest("modules/printing/print-orders.html").then(function (template) {
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
					printWindow.document.write('<html><head><link rel="stylesheet" type="text/css" href="modules/printing/print-orders.css" /><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" /><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap-theme.min.css" /></head><body>' + printContents + '</body></html>');

					$(printWindow).load(function () {
						printWindow.focus();
						printWindow.print();
					});
				}, 0);
			});
		};
		$scope.filePicked = function(element) {
			var file = element.files[0];
			log("Beszerzési lista betöltése megkezdve: " + file.name);
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
					var min = minutes % 60;
					var hrs = Math.floor(minutes / 60);

					var result = "";
					if (hrs < 10) {
						result += "0";
					}
					result += hrs;
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
							log("Ez a cikkszám nem szerepel a KAPA-ban: " + sku + " (" + row[columns["Név"]] + ")");
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

						//=if(F14="hűtőben", "", if(D14<>"Levelek", B14*10, (B14*2)+if (E14 <>E13, 4,0))))
						var harvestTime;
						if (plots === "hűtőben") {
							harvestTime = 0;
						} else {
							if (product.baseCategory !== "Levelek") {
								harvestTime = count * 10;
							} else {
								harvestTime = count * 2;
							}
							// If need to change plot, add some extra time
							if (plots != previousOrder.plots) {
								harvestTime += 4;
							}
						}

						var order = {
							product: product,
							count: count,
							netValue: netPrice * count,
							plots: plots,
							harvestTime: harvestTime
						};
						console.log("Found:", product, order);
						orders.push(order);
						previousOrder = order;
					});

					if (numberOfMissingProducts) {
						log("Összesen " + numberOfMissingProducts + " termék nem szerepelt a KAPA-ban");
					}

					var sumNetValue = 0;
					var sumNetValueToHarvest = 0;
					var sumUnitsToHarvest = 0;

					// All times are in minutes
					var sumHarvestTime = 0;
					var sumCleanupTime = 30;
					var dailyMeetingTime = 30;

					orders.forEach(function (order) {
						sumNetValue += order.netValue;
						if (order.plots !== "hűtőben") {
							sumNetValueToHarvest += order.netValue;
							sumUnitsToHarvest += order.count;
						}
						sumHarvestTime += order.harvestTime;
					});

					var sumWashingTime = sumUnitsToHarvest * 1;
					var sumLabelingTime = sumUnitsToHarvest * 0.5;

					var remainingTimeInDay = 8 * 60 - (sumHarvestTime + sumWashingTime + sumLabelingTime + sumCleanupTime + dailyMeetingTime);

					$scope.notes = [
						{
							name: "Napi nettó rendelés összesen",
							value: sumNetValue.toLocaleString() + " Ft"
						},{
							name: "Ebből szüretelendő összesen",
							value: sumNetValueToHarvest.toLocaleString() + " Ft"
						},{
							name: "Összesen szüretelendő egységek",
							value: sumUnitsToHarvest.toLocaleString() + " egység"
						},{
							name: "Össz várható szedési idő (óra)",
							value: mins(sumHarvestTime)
						},{
							name: "Össz várható mosási idő (óra)",
							value: mins(sumWashingTime)
						},{
							name: "Össz várható matricázási idő (óra)",
							value: mins(sumLabelingTime)
						},{
							name: "Rendrakás",
							value: mins(sumCleanupTime)
						},{
							name: "Napi megbeszélés",
							value: mins(dailyMeetingTime)
						},{
							name: "Más feladatokra idő",
							value: mins(remainingTimeInDay)
						},
					];
					$scope.orders = orders;
				});
			};
			reader.readAsText(file, "iso-8859-2");
		}
	});

/*
	printingModule.controller("PriceTagPrinterController", function ($scope, $filter, priceTagManager, log) {
		$scope.priceTags = [];

		log("Árcímkék betöltése... (amíg tölt, nem lehet árcímkét nyomtatni)");
		priceTagManager.fetch().then(function (priceTags) {
			$scope.priceTags = priceTags;
			log("Árcímkék betöltve");
		});

		$scope.printPriceTags = function() {
			if (!$scope.priceTags) {
				alert("Nincs betöltve árcímke adat");
				return;
			}

			var printWindow = window.open("modules/printing/print-pricetags.html", "KAPA_PrintPriceTags", "width=800, height=600");
			if (!printWindow) {
				alert("Nem tudom megnyitni a nyomtatási ablakot");
				return;
			}

			$(printWindow).load(function () {
				var printBody = $(printWindow.document).contents().find("body");
				printBody.empty();
				$scope.priceTags.forEach(function (priceTag) {
					var priceTagDiv = $('<div class="tag"></div>');
					var mainDiv = $('<div class="main"></div>');
					var translationsDiv = $('<div class="translations"></div>');
					priceTagDiv.append(mainDiv);
					priceTagDiv.append(translationsDiv);

					mainDiv.append('<div class="name"><p>' + priceTag.hu + '</p></div>');
					mainDiv.append('<div class="price"><p>' + priceTag.price + '</p></div>');

					[priceTag.en, priceTag.de, priceTag.fr, priceTag.ru].forEach(function (translation) {
						if (translation) {
							translationsDiv.append('<div><p>' + translation + '</p></div>');
						}
					});
					printBody.append(priceTagDiv);
				});
				printWindow.focus();
				printWindow.setTimeout(function () {
					printWindow.print();
				}, 1000);
			});
		}
	});
*/
})();
