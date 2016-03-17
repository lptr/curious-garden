(function() {
	var module = angular.module("kapa.printing.products", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	module.config(function($routeProvider) {
		$routeProvider
			.when('/printing/products', {
				templateUrl: 'modules/printing/products/module.html'
			});
	});

	module.controller("LabelPrinterController", function ($scope, $filter, productManager, log) {
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

			var printWindow = window.open("modules/printing/products/print-product-labels.html", "KAPA_PrintProductLabels", "width=800, height=600");
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
})();
