(function () {
	var transactionModule = angular.module("kapa.transactions", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/transactions', {
				templateUrl: 'modules/transactions/transactions.html',
				controller: 'TransactionsController'
			});
	});

	transactionModule.controller("TransactionsController", function ($scope, $filter, $uibModal, normalizer, kapaServer, payeeManager, accountManager, categoryManager) {
		$scope.accounts = [];
		$scope.payees = [];
		$scope.categories = [];
		$scope.type = "withdrawal";

		accountManager.load(function (accounts) {
			$scope.accounts = accounts;
		});
		payeeManager.load(function (payees) {
			$scope.payees = payees;
		});
		categoryManager.load(function (categories) {
			$scope.categories = categories;
		});

		$scope.find = normalizer.find;

		$scope.reset = function () {
			$scope.payee = "";
			$scope.amount = undefined;
			$scope.sourceAccount = $scope.type == "withdrawal" ? "KK kassza" : "";
			$scope.targetAccount = "";
			$scope.status = "paid";
			$scope.vat = false;
			$scope.category = "";
			$scope.memo = "";
			$scope.transactionDate = new Date();
			$scope.paymentDate = new Date();
			$scope.$broadcast('show-errors-reset');
		}

		$scope.reset();

		$scope.submit = function () {
			if ($scope.transaction.$invalid) {
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
			var popup = $uibModal.open({
				templateUrl: "save-dialog.html"
			});

			var category;
			var vat;
			if ($scope.type == "transfer") {
				category = "transfer";
				vat = false;
			} else {
				category = $scope.category;
				vat = $scope.vat;
			}

			var formData = {
				payee: $scope.payee,
				amount: $scope.amount,
				status: $scope.status,
				vat: vat,
				category: category,
				memo: $scope.memo,
				transactionDate: $filter("date")($scope.transactionDate, "yyyy-MM-dd"),
				paymentDate: $filter("date")($scope.paymentDate, "yyyy-MM-dd")
			};

			if ($scope.type == "withdrawal" || $scope.type == "transfer") {
				formData.sourceAccount = $scope.sourceAccount;
			} else {
				formData.sourceAccount = null;
			}

			if ($scope.type == "deposit" || $scope.type == "transfer") {
				formData.targetAccount = $scope.targetAccount;
			} else {
				formData.targetAccount = null;
			}

			kapaServer.query("submitTransaction", formData).success(function (id) {
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		}
	});
})();
