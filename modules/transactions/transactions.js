(function () {
	var transactionModule = angular.module("kapa.transactions", ["kapa.server", "ngRoute", "ui.bootstrap", "ui.bootstrap.showErrors"]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/transactions', {
				templateUrl: 'modules/transactions/transactions.html',
				controller: 'TransactionsController'
			});
	});

	transactionModule.controller("TransactionsController", function ($scope, $filter, kapaServer) {
		$scope.accounts = [];
		$scope.payees = [];
		$scope.categories = [];

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
			$scope.amount = 0;
			$scope.sourceAccount = "";
			$scope.targetAccount = "";
			$scope.status = "";
			$scope.category = "";
			$scope.memo = "";
			$scope.date = new Date();
			$scope.costMonth = new Date();
			$scope.$broadcast('show-errors-reset');
		}

		$scope.reset();
		$scope.submiting = false;

		$scope.submit = function () {
			if ($scope.transaction.$invalid) {
				alert("Invalid data");
				return;
			}
			$scope.submiting = true;

			var formData = {
				payee: $scope.payee,
				amount: $scope.amount,
				sourceAccount: $scope.sourceAccount,
				targetAccount: $scope.targetAccount,
				status: $scope.status,
				category: $scope.category,
				memo: $scope.memo,
				date: $filter("date")($scope.date, "yyyy-MM-dd"),
				costMonth: $filter("date")($scope.costMonth, "yyyy-MM")
			};
			kapaServer.query("submit", formData).success(function (id) {
				alert("Successfully submited new cost with ID " + id + ".");
				$scope.reset();
			}).finally(function () {
				$scope.submiting = false;
			});
		}

		var selectType = function (type) {
			console.log("selectType " + type);
			var selectAccount = function (name, select) {
				console.log("selectAccount(" + name + ", " + select + ")");
				$("#" + name + "AccountGroup").collapse(select ? "show" : "hide");
				if (!select) {
					$("#" + name + "AccountSelect").val("custom");
					$("#" + name).val("");
				}
			};
			var source;
			var target;
			var color;
			switch (type) {
				case "withdrawal":
					source = true;
					target = false;
					color = "#FFF4F4";
					break;
				case "deposit":
					source = false;
					target = true;
					color = "#F4FFF4";
					break;
				case "transfer":
					source = true;
					target = true;
					color = "#F4F4FF";
					break;
			}
			selectAccount("source", source);
			selectAccount("target", target);
			$("#amount").animate({backgroundColor: color});
		}

		// Init
		var transactionType = $("form input[name = 'type']");
		transactionType.change(function (x) {
			selectType($("#transactionType input:checked").attr("value"));
		});
		selectType("withdrawal");
	});
})();
