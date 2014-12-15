(function () {
	var workModule = angular.module("kapa.work", ["kapa.server", "ngRoute", "ui.bootstrap", "ui.bootstrap.showErrors"]);

	workModule.config(function ($routeProvider) {
		$routeProvider
			.when('/work', {
				templateUrl: 'modules/work/work.html',
				controller: 'WorkController'
			});
	});

	workModule.controller("WorkController", function ($scope, $filter, $modal, kapaServer) {
		$scope.employees = [];
		$scope.categories = [];

		kapaServer.query("getEmployees").success(function (employees) {
			console.log("Got employees", employees);
			$scope.employees = employees;
		});
		kapaServer.query("getWorkCategories").success(function (categories) {
			console.log("Got work categories", categories);
			$scope.categories = categories;
		});

		$scope.reset = function () {
			$scope.employee = "";
			$scope.hours = undefined;
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

			var formData = {
				employee: $scope.employee,
				hours: $scope.hours,
				category: $scope.category,
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
