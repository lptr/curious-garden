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

	workModule.controller("WorkController", function ($scope, $filter, $modal, kapaServer, categoryManager, employeeManager) {
		$scope.employees = [];
		$scope.categories = [];

		employeeManager.load(function (employees) {
			$scope.employees = employees;
		});
		categoryManager.load(function (categories) {
			$scope.categories = categories;
		});

		$scope.reset = function () {
			$scope.employee = "";
			$scope.hours = undefined;
			$scope.minutes = undefined;
			$scope.category = "";
			$scope.memo = "";
			$scope.date = new Date();
			$scope.$broadcast('show-errors-reset');
		}

		$scope.reset();

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
				employee: $scope.employee,
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
