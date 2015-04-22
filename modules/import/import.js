(function() {
	var importModule = angular.module("kapa.import", [
			"kapa.services",
			"ngRoute",
			"ui.bootstrap",
			"ui.bootstrap.showErrors"
		]);

	importModule.config(function($routeProvider) {
		$routeProvider
			.when('/import', {
				templateUrl: 'modules/import/import.html'
			});
	});

	importModule.factory("log", function ($filter) {
		return function (message) {
			var importLog = $("#importLog");
			var logMessage = "";
			// logMessage += $filter("date")(new Date(), "yyyy-MM-dd HH:MM:ss") + ": ";
			logMessage += message;
			logMessage += "\n" + importLog.text();
			importLog.text(logMessage);
		};
	});

	importModule.controller("ImportMagnetController", function($scope, $filter, $modal, kapaServer) {
		$scope.file = undefined;
		$scope.import = function() {
			var reader = new FileReader();
			reader.onload = function(event) {
				console.log("File data", reader.result);
				var parser = new DOMParser();
				var xml = parser.parseFromString(reader.result, "text/xml");
				console.log("XML parsed", xml);
				var transactions = xml.evaluate("//Tranzakcio", xml, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

				var getValue = function (transaction, field) {
					var elements = transaction.getElementsByTagName(field);
					return elements.length == 0 ? null : elements[0].textContent;
				};

				var imported = [];

				for (var transaction = transactions.iterateNext(); transaction; transaction = transactions.iterateNext()) {
					console.log("Transaction", transaction);

					// XML Format:
					// <Tranzakcio NBID="764934324">
					// 	<Tranzakcioszam>54574584</Tranzakcioszam>
					// 	<Nev>John Smith</Nev>
					// 	<Szamlaszam>16200113-18513284</Szamlaszam>
					// 	<Ellenpartner>Something Something Co.</Ellenpartner>
					// 	<Ellenszamla>HU10 1170 0132 4336 0940 1110 0001</Ellenszamla>
					// 	<Osszeg Devizanem="HUF">100.00</Osszeg>
					// 	<Kozlemeny>Message</Kozlemeny>
					// 	<Terhelesnap>2014.10.01.</Terhelesnap>
					// 	<Esedekessegnap>2014.10.01.</Esedekessegnap>
					// 	<Jutalekosszeg Devizanem="HUF">0.00</Jutalekosszeg>
					// 	<Tipus>Átutalás (IG2)</Tipus>
					// </Tranzakcio>

					var id = getValue(transaction, "Tranzakcioszam");
					var payee = getValue(transaction, "Ellenpartner");
					var payeeAccount = getValue(transaction, "Ellenszamla");
					var message = getValue(transaction, "Kozlemeny");
					var amount = parseInt(getValue(transaction, "Osszeg"));
					var accountNumber = getValue(transaction, "Szamlaszam");
					var dateString = getValue(transaction, "Terhelesnap");

					var account;
					var sourceAccount;
					var targetAccount;
					if (accountNumber == "16200113-18513284") {
						account = "KK MagnetBank";
					} else if (accountNumber == "16200113-18514247") {
						account = "KK Bt.";
					} else {
						throw "Error, unknown account: " + accountNumber;
					}
					if (amount > 0) {
						sourceAccount = null;
						targetAccount = account;
					} else {
						sourceAccount = account;
						targetAccount = null;
						amount = -amount;
					}

					var dateParts = dateString.split(/\./);
					var date = new Date(
						parseInt(dateParts[0], 10),
						parseInt(dateParts[1], 10) - 1, // month is 0-based
						parseInt(dateParts[2], 10)
					);

					var memo = message + " (" + id + ", " + payeeAccount + ")";

					var item = {
						payee: payee,
						amount: amount,
						sourceAccount: sourceAccount,
						targetAccount: targetAccount,
						category: "imported",
						memo: memo,
						status: "paid",
						date: $filter("date")(date, "yyyy-MM-dd"),
						costMonth: $filter("date")(date, "yyyy-MM")
					}

					console.log("Transaction", item);

					imported.push(item);
				}

				console.log("Parsed transactions", imported.length, imported);

				var submitTransaction = function (index) {
					if (index < imported.length) {
						kapaServer
							.query("submitTransaction", imported[index])
							.success(function (id) {
								console.log("Uploaded transaction " + (index + 1) + "/" + imported.length);
								submitTransaction(index + 1);
							})
							.error(function (error) {
								alert("Upload failed: " + error + " at " + index + " out of " + imported.length);
							});
					} else {
						alert("Finished uploading");
					}
				}
				submitTransaction(0);
			};
			reader.readAsText($scope.file);
		}
		$scope.filePicked = function(element) {
			$scope.file = element.files[0];
		}
	});

	importModule.controller("LabelPrinterController", function ($scope, $filter, productManager, log) {
		$scope.products = null;
		$scope.labels = [];

		productManager.load(function (products) {
			$scope.products = products;
			log("Termékek betöltve");
		});

		$scope.printLabels = function() {
			if (!$scope.labels) {
				alert("Nincs betöltve matrica adat");
				return;
			}

			var printWindow = window.open("modules/import/labels.html", "KAPA_PrintLabels", "width=800, height=600");
			if (!printWindow) {
				alert("Nem tudom megnyitni a nyomtatási ablakot");
				return;
			}

			$(printWindow).load(function () {
				var printBody = $(printWindow.document).contents().find("body");
				printBody.empty();
				$scope.labels.forEach(function (label) {
					var labelDiv = $('<div class="label"></div>');
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
				CSV.COLUMN_SEPARATOR = ";";
				var data = CSV.parse(reader.result);
				console.log("Raw CSV data:", data);

				// Skip first line
				data.shift();

				var numberOfProducts = data.length;
				var numberOfMissingProducts = 0;

				$scope.$apply (function() {
					$scope.labels = [];
					while (data.length > 0) {
						var row = data.shift();
						// CSV format:
						// Cikkszam;Nev;Darabszam;Netto ar;Brutto ar;Gyarto, Rendelesi azonosito(k)
						var productSKU = row[0];
						var productNameHU;
						var productNameEN;
						var product = $scope.products[productSKU];
						if (!product) {
							log("Ez a cikkszám nem szerepel a KAPA-ban: " + productSKU);
							numberOfMissingProducts++;
							continue;
						}
						productNameEN = product.en;
						productNameHU = product.hu;

						var count = row[2];
						for (var idx = 0; idx < count; idx++) {
							$scope.labels.push({
								en: productNameEN,
								hu: productNameHU,
								date: date
							});
						}
					}
					log("Matricák adatai betöltve, összesen " + numberOfProducts + " termék, " + $scope.labels.length + " matrica");
					if (numberOfMissingProducts) {
						log("Összesen " + numberOfMissingProducts + " termék nem szerepelt a KAPA-ban, ezekhez nem nyomtatunk matricát");
					}
				});
			};
			reader.readAsText(file, "iso-8859-2");
		}
	});
})();
