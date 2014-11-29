(function () {
	var transactionModule = angular.module("kapa.transactions", ["kapa.server", "ngRoute", "ui.bootstrap"]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/transactions', {
				templateUrl: 'modules/transactions/transactions.html',
				controller: 'TransactionsController'
			});
	});

	transactionModule.controller("TransactionsController", function ($scope, kapaServer) {
		$scope.accounts = [];
		$scope.payees = [];
		$scope.categories = [];

		$scope.payee = "";
		$scope.amount = 0;
		$scope.sourceAccount = "";
		$scope.targetAccount = "";
		$scope.memo = "";
		$scope.date = new Date();
		$scope.costMonth = new Date();

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

		var submitForm = function(form) {
			var form = $(form);
			var payee = form.find("[name = 'payee']").val();
			var amount = form.find("[name = 'amount']").val();
			var sourceAccount = form.find("[name = 'sourceAccount']").val();
			var targetAccount = form.find("[name = 'targetAccount']").val();
			var status = form.find("[name = 'status']").val();
			var category = form.find("[name = 'category']").val();
			var date = form.find("[name = 'date']").val();
			var costMonth = form.find("[name = 'costMonth']").val();
			var memo = form.find("[name = 'memo']").val();

			// Disable form
			form.find("input[type != 'submit'], select, textarea").prop("disabled", "true");

			var formData = {
				payee: payee,
				amount: amount,
				sourceAccount: sourceAccount,
				targetAccount: targetAccount,
				status: status,
				category: category,
				date: date,
				costMonth: costMonth,
				memo: memo
			};
			kapaServer.query("submit", formData).success(function (id) {
				alert("Successfully submited new cost with ID " + id + ".");
				form.find("input[type != 'submit'], select, textarea").val("").prop("disabled", false);
				form.find("input:radio, input:checkbox")
					.removeAttr("checked").removeAttr("selected").prop("disabled", false);
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
