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

	importModule.controller("ImportMagnetController", function($scope, $filter, $uibModal, kapaServer, log) {
		$scope.transactions = [];
		$scope.uploading = false;
		$scope.import = function() {
			var submitTransactions = function (start) {
				if (start < $scope.transactions.length) {
					var end = Math.min(start + 5, $scope.transactions.length);
					log("Tranzakciók feltöltése: " + (start + 1) + "-" + end + " / " + $scope.transactions.length);
					kapaServer
						.query("submitTransactions", $scope.transactions.slice(start, end))
						.then(function (id) {
							submitTransactions(end);
						})
						.catch(function (error) {
							$scope.uploading = false;
							log("HIBA a tranzakciók feltöltése közben: " + error);
						});
				} else {
					log("Tranzakciók feltöltése kész");
					$scope.uploading = false;
				}
			}
			$scope.uploading = true;
			submitTransactions(0);
		};
		$scope.filePicked = function(element) {
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

				$scope.transactions = [];

				for (var transaction = transactions.iterateNext(); transaction; transaction = transactions.iterateNext()) {
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
						account = "Bt. Magnet";
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

					// Melinda: let's not fill in the transaction date
					var transactionDate = null;  // $filter("date")(date, "yyyy-MM-dd");
					var paymentDate = $filter("date")(date, "yyyy-MM-dd");
					var memo = message + " (" + id + ", " + payeeAccount + ")";

					var item = {
						payee: payee,
						amount: amount,
						sourceAccount: sourceAccount,
						targetAccount: targetAccount,
						category: "imported",
						memo: memo,
						status: "paid",
						vat: null,
						transactionDate: transactionDate,
						paymentDate: paymentDate
					}

					console.log("Transaction parsed", item);

					$scope.$apply (function() {
						$scope.transactions.push(item);
					});
				}

				log("Összesen " + $scope.transactions.length + " tranzakció betöltve");
			};
			log("Tranzakciók betöltése: " + element.files[0].name);
			reader.readAsText(element.files[0]);
		}
	});
})();
