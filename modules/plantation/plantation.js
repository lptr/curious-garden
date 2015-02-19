(function () {
	var transactionModule = angular.module("kapa.plantation", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/plantation', {
				templateUrl: 'modules/plantation/plantation.html',
				controller: 'PlantationsController'
			});
	});

	transactionModule.filter("location", function () {
		return function (loc) {
			if (loc == null) {
				return "?";
			}
			return loc.plot + loc.lane + loc.row;
		};
	});

	transactionModule.controller("PlantationsController", function ($scope, kapaServer, plantationManager) {
		$scope.items = [];

		plantationManager.load(function (items) {
			$scope.items = items;
		});

		$scope.isDone = function (item) {
			return item.sowing && item.sowing.doneDate;
		};

		$scope.switch = function (item) {
			var user;
			var date;
			if ($scope.isDone(item)) {
				user = null;
				date = null;
			} else {
				user = $scope.user.name;
				date = new Date();
			}
			item.refreshing = true;
			kapaServer.query("setPlantationDone", {
				id: item.id,
				activity: "sowing",
				user: user,
				date: date
			}).success(function () {
				item.sowing = item.sowing || {};
				item.sowing.doneBy = user;
				item.sowing.doneDate = date;
				item.refreshing = false;
			});
		};
	});
})();
