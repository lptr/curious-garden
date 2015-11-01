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

	workModule.controller("WorkController", function ($scope, $modal, $filter, normalizer, kapaServer, userManager, categoryManager, employeeManager) {
		$scope.employees = [];
		$scope.categories = [];

		var setEmployeeToActiveUser = function () {
			// Make sure both employees and user are loaded, and no employee is set already
			if ($scope.user && !$scope.employee && $scope.employees) {
				for (var i = 0; i < $scope.employees.length; i++) {
					var employee = $scope.employees[i];
					if (employee.email === $scope.user.email) {
						$scope.employee = employee;
						break;
					}
				}
			}
		};

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
			kapaServer.query("getWorksByActiveUser", { from: from, until: until }).success(function (items) {
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

		userManager.load(function (user) {
			$scope.user = user;
			setEmployeeToActiveUser();
		});
		employeeManager.load(function (employees) {
			$scope.employees = employees;
			setEmployeeToActiveUser();
		}, "work");
		categoryManager.load(function (categories) {
			$scope.categories = categories;
		});

		$scope.submit = function () {
			if ($scope.work.$invalid) {
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

			kapaServer.query("submitWork", formData).success(function (id) {
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		}
	});
})();
