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

	workModule.controller("WorkController", function ($scope, $filter, $modal, normalizer, kapaServer, userManager, categoryManager, employeeManager) {
		$scope.employees = [];
		$scope.categories = [];

		var setEmployeeToActiveUser = function () {
			// Make sure both employees and user are loaded, and no employee is set already
			if ($scope.user && !$scope.employee && $scope.employees) {
				for (var i = 0; i < $scope.employees.length; i++) {
					var employee = $scope.employees[i];
					if (employee.email === $scope.user) {
						$scope.employee = employee;
						break;
					}
				}
			}
		};

		$scope.find = normalizer.find;

		$scope.reset = function () {
			$scope.employee = undefined;
			$scope.hours = undefined;
			$scope.minutes = undefined;
			$scope.category = undefined;
			$scope.memo = "";
			$scope.date = new Date();
			$scope.$broadcast('show-errors-reset');
		}

		$scope.reset();

		userManager.load(function (user) {
			$scope.user = user;
			setEmployeeToActiveUser();
		});
		employeeManager.load(function (employees) {
			$scope.employees = employees;
			setEmployeeToActiveUser();
		});
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

			var category = categoryManager.convertCategory($scope.categories, $scope.category);

			var hours = 0;
			if ($scope.hours) {
				hours += parseInt($scope.hours);
			}
			if ($scope.minutes) {
				hours += parseInt($scope.minutes) / 60;
			}

			var formData = {
				employee: $scope.employee.name,
				hours: hours,
				category: category,
				memo: $scope.memo,
				date: $filter("date")($scope.date, "yyyy-MM-dd"),
				costMonth: $filter("date")($scope.date, "yyyy-MM")
			};

			kapaServer.query("submitWork", formData).success(function (id) {
				$scope.reset();
			}).finally(function () {
				popup.close();
			});
		}
	});
})();
