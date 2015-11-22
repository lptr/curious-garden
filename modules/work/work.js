(function () {
	var workModule = angular.module("kapa.work", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	workModule.config(function ($routeProvider) {
		$routeProvider
			.when('/work', {
				templateUrl: 'modules/work/work.html',
				controller: 'WorkController'
			});
	});

	workModule.controller("WorkController", function ($scope, $uibModal, $filter, $q, normalizer, kapaServer, userManager, categoryManager, employeeManager) {
		$scope.employees = [];
		$scope.categories = [];

		$scope.find = normalizer.find;

		// Recent work items
		$scope.recentItems = [];
		$scope.formatTime = function (time) {
			var hours = Math.floor(time);
			var minutes = Math.round((time % 1) * 60);
			return hours + ":" + (minutes < 10 ? "0" : "") + minutes;
		};
		$scope.formatTimestamp = function (timestamp) {
			var date = new Date(Date.parse(timestamp));
			var hours = date.getHours();
			var minutes = date.getMinutes();
			return hours + ":" + (minutes < 10 ? "0" : "") + minutes;
		};
		var reloadRecentWork = function () {
			var now = new Date();
			var from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			var until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			console.log("Querying works by active user between", from, until);
			kapaServer.query("getWorksByActiveUser", { from: from, until: until }, true).then(function (items) {
				console.log("getWorksByActiveUser received: ", items);
				$scope.recentItems = items;
				$scope.sumRecentWorkTime = 0;
				items.forEach(function (item) {
					$scope.sumRecentWorkTime += item.hours;
				});
			});
		};

		$scope.employee = undefined;
		$scope.reset = function () {
			$scope.hours = undefined;
			$scope.minutes = undefined;
			$scope.category = undefined;
			$scope.memo = "";
			$scope.date = new Date();
			$scope.$broadcast('show-errors-reset');
			reloadRecentWork();
		}

		$scope.reset();

		var userFetched = userManager.fetch();
		var employeesFetched = employeeManager.fetch("work");
		var categoriesFetched = categoryManager.fetch();

		userFetched.then(function (user) {
			$scope.user = user;
		});
		employeesFetched.then(function (employees) {
			$scope.employees = employees;
		});
		categoriesFetched.then(function (categories) {
			$scope.categories = categories;
		});

		$q.all({
			user: userFetched,
			employees: employeesFetched
		}).then(function (fetched) {
			if (!$scope.employee) {
				fetched.employees.forEach(function (employee) {
					if (employee.email === fetched.user.email) {
						$scope.employee = employee;
					}
				});
			}
		});

		$scope.submit = function () {
			if ($scope.work.$invalid) {
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

			var hours = 0;
			if ($scope.hours) {
				hours += parseInt($scope.hours);
			}
			if ($scope.minutes) {
				hours += parseInt($scope.minutes) / 60;
			}

			var category = typeof $scope.category == "string" ? $scope.category : $scope.category.name;
			var quantity = $scope.category.unit ? $scope.quantity : null;

			var formData = {
				employee: $scope.employee.name,
				hours: hours,
				category: category,
				quantity: quantity,
				memo: $scope.memo,
				date: $filter("date")($scope.date, "yyyy-MM-dd")
			};

			kapaServer.query("submitWork", formData).then(function (id) {
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		}
	});
})();
