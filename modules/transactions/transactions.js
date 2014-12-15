(function () {
	var transactionModule = angular.module("kapa.transactions", ["kapa.server", "ngRoute", "ui.bootstrap", "ui.bootstrap.showErrors"]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/transactions', {
				templateUrl: 'modules/transactions/transactions.html',
				controller: 'TransactionsController'
			});
	});

	transactionModule.controller("TransactionsController", function ($scope, $filter, $modal, kapaServer) {
		$scope.accounts = [];
		$scope.payees = [];
		$scope.categories = [];
		$scope.type = "withdrawal";

		kapaServer.query("getAccounts").success(function (accounts) {
			console.log("Got accounts", accounts);
			$scope.accounts = accounts;
		});
		kapaServer.query("getPayees").success(function (payees) {
			console.log("Got payees", payees);
			$scope.payees = payees;
		});
		kapaServer.query("getTransactionCategories").success(function (categories) {
			console.log("Got transaction categories", categories);
			$scope.categories = categories;
		});

		$scope.reset = function () {
			$scope.payee = "";
			$scope.amount = undefined;
			$scope.sourceAccount = "";
			$scope.targetAccount = "";
			$scope.status = "";
			$scope.category = "";
			$scope.memo = "";
			$scope.date = new Date();
			$scope.$broadcast('show-errors-reset');
		}

		$scope.reset();

		$scope.submit = function () {
			if ($scope.transaction.$invalid) {
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

			var formData = {
				payee: $scope.payee,
				amount: $scope.amount,
				status: $scope.status,
				category: $scope.category,
				memo: $scope.memo,
				date: $filter("date")($scope.date, "yyyy-MM-dd"),
				costMonth: $filter("date")($scope.date, "yyyy-MM")
			};

			if ($scope.type == "withdrawal" || $scope.type == "transfer") {
				formData.sourceAccount = $scope.sourceAccount;
			}
			if ($scope.type == "deposit" || $scope.type == "transfer") {
				formData.targetAccount = $scope.targetAccount;
			}

			kapaServer.query("submitTransaction", formData).success(function (id) {
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		}
	});
})();
