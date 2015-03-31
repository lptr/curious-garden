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

	transactionModule.controller("TransactionsController", function ($scope, $filter, $modal, normalizer, kapaServer, payeeManager, accountManager, categoryManager) {
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

			var categoryEnglish = $scope.category;
			if ($scope.type == "transfer") {
				categoryEnglish = "transfer";
			}
			var category = categoryManager.convertFromHungarianToEnglish($scope.categories, categoryEnglish);

			var formData = {
				payee: $scope.payee,
				amount: $scope.amount,
				status: $scope.status,
				category: category,
				memo: $scope.memo,
				date: $filter("date")($scope.date, "yyyy-MM-dd"),
				costMonth: $filter("date")($scope.date, "yyyy-MM")
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
