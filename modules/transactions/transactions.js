(function () {
	var transactionModule = angular.module("kapa.transactions", ["kapa.server", "ngRoute"]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/transactions', {
				templateUrl: 'modules/transactions/transactions.html',
				controller: 'TransactionsController'
			});
	});

	transactionModule.controller("PayeeController", function (kapaServer) {
		var payeeSelect = $("#payeeSelect");
		var updatePayee = function () {
			var payee = $("#payee");
			var selectedPayee = payeeSelect.val();
			var isCustom = selectedPayee === "custom";
			payee.prop("disabled", !isCustom);
			if (isCustom) {
				$("#customPayee").collapse("show");
				payee.val("");
				payee.focus();
			} else {
				$("#customPayee").collapse("hide");
				payee.val(payeeSelect.val());
			}
		};
		payeeSelect.change(updatePayee);
		payeeSelect.append($("<option></option")
			.attr("value", "custom")
			.text("Custom..."));
		payeeSelect.val("custom");
		updatePayee();
		kapaServer.query("getPayees", null, function (payees) {
			var firstLetter = "";
			var group;
			$.each(payees, function(index, value) {
				var currentFirstLetter = value.toUpperCase().charAt(0);
				if (!group || firstLetter !== currentFirstLetter) {
					firstLetter = currentFirstLetter;
					group = $("<optgroup></optgroup>")
						.attr("label", firstLetter);
					payeeSelect.append(group);
				}
				group
					.append($("<option></option>")
					.attr("value", value)
					.text(value.substring(0, 24)));
			});
		});
	});

	transactionModule.directive("kapaPayee", function () {
		return {
			restrict: "E",
			templateUrl: "modules/transactions/payee.html",
			controller: "PayeeController"
		}
	});

	transactionModule.controller("TransactionsController", function (kapaServer) {
		var configureAccount = function (accountName) {
			var accountSelect = $("#" + accountName + "AccountSelect");
			var account = $("#" + accountName + "Account");
			var customAccount = $("#" + accountName + "CustomAccount");
			var updateAccount = function () {
				var selectedAccount = accountSelect.val();
				var isCustom = selectedAccount === "custom";
				account.prop("disabled", !isCustom);
				if (isCustom) {
					customAccount.collapse("show");
					account.val("");
					account.focus();
				} else {
					customAccount.collapse("hide");
					account.val(accountSelect.val());
				}
			};
			accountSelect.change(updateAccount);
			accountSelect.append($("<option></option")
				.attr("value", "custom")
				.text("Custom..."));
			accountSelect.val("custom");
			updateAccount();
			kapaServer.query("getAccounts", null, function (accounts) {
				$.each(accounts, function(index, value) {
					accountSelect
						.append($("<option></option>")
						.attr("value", value)
						.text(value));
				});
			});
		};

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
			kapaServer.query("submit", formData, function (id) {
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
		
		configureAccount("source");
		configureAccount("target");

		var categorySelect = $("#categorySelect");
		var updateCategory = function () {
			var category = $("#category");
			var selectedCategory = categorySelect.val();
			var isCustom = selectedCategory === "custom";
			category.prop("disabled", !isCustom);
			if (isCustom) {
				$("#customCategory").collapse("show");
				category.val("");
				category.focus();
			} else {
				category.val(categorySelect.find(":selected").parent().prop("label") + " - " + categorySelect.val());
				$("#customCategory").collapse("hide");
			}
		};
		categorySelect.change(updateCategory);
		categorySelect
			.append($("<option></option>")
			.attr("value", "custom")
			.text("Custom..."));
		updateCategory();
		kapaServer.query("getCategories", null, function (categories) {
			$.each(categories, function (index, category) {
				var categoryGroup = $("<optgroup></optgroup>")
					.attr("label", category.name);
				categorySelect.append(categoryGroup);
				$.each(category.subs, function (index, subCategory) {
					categoryGroup
						.append($("<option></option>")
						.attr("value", subCategory)
						.text(subCategory));
				});
			});
		});

		$("#date").val(new Date().toISOString().slice(0,10));
		$("#costMonth").val(new Date().toISOString().slice(0,7));
		
		var transactionType = $("form input[name = 'type']");
		transactionType.change(function (x) {
			selectType($("#transactionType input:checked").attr("value"));
		});
		selectType("withdrawal");
	});
})();
