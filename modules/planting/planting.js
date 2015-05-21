(function () {
	var plantingModule = angular.module("kapa.planting", [
		"kapa.services",
		"kapa.utils.tables",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	plantingModule.config(function ($routeProvider) {
		$routeProvider
			.when('/planting', {
				templateUrl: 'modules/planting/planting.html'
			});
	});
	
	plantingModule.factory("fajok", function (tables) {
		return new tables.Table({
			name: "Fajok",
			properties: [
				{ name: "nev", title: "Név" },
				{ name: "name", title: "Name" },
				{ name: "csoport", title: "Növénytani csoport" },
				{ name: "optimalisHomerseklet", title: "Optimális hőmérséklet", unit: "℃" },
				{ name: "csirazas5c",  title: "5℃",  column: { width: 30 } },
				{ name: "csirazas10c", title: "10℃", column: { width: 30 } },
				{ name: "csirazas15c", title: "15℃", column: { width: 30 } },
				{ name: "csirazas20c", title: "20℃", column: { width: 30 } },
				{ name: "csirazas25c", title: "25℃", column: { width: 30 } },
				{ name: "csirazas30c", title: "30℃", column: { width: 30 } },
				{ name: "csirazas35c", title: "35℃", column: { width: 30 } },
				{ name: "csirazas40c", title: "40℃", column: { width: 30 } },
				{ name: "optialisCsirazas", title: "Optiomalis csírázás", unit: "hét", recalculate: function () {
					return 12;
				}},
				{ name: "magPerGramm", title: "Magok száma" },
				{ name: "palantazasIdeje", title: "Palántázás ideje" }
			]
		});
	});

	plantingModule.controller("FajokController", function ($scope, kapaServer, fajok) {
		$scope.table = fajok;
	});

	plantingModule.controller("ChangeTrackingController", function ($scope, changeTracking) {
		$scope.pending = 0;
		changeTracking.operationStartListeners.push(function () {
			$scope.pending++;
		});
		changeTracking.operationSuccessListeners.push(function () {
			$scope.pending--;
		});
		changeTracking.operationFailureListeners.push(function () {
			$scope.pending--;
		});
	});
})();
