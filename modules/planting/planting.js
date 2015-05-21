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
				{ name: "nev", title: "Név", width: 120 },
				{ name: "name", title: "Name", width: 120 },
				{ name: "csoport", title: "Növénytani csoport" },
				{ name: "optimalisHomerseklet", title: "Optimális hőmérséklet", unit: "℃" },
				{ name: "csirazas5c",  title: "5℃",  type: "numeric", width: 30 },
				{ name: "csirazas10c", title: "10℃", type: "numeric", width: 30 },
				{ name: "csirazas15c", title: "15℃", type: "numeric", width: 30 },
				{ name: "csirazas20c", title: "20℃", type: "numeric", width: 30 },
				{ name: "csirazas25c", title: "25℃", type: "numeric", width: 30 },
				{ name: "csirazas30c", title: "30℃", type: "numeric", width: 30 },
				{ name: "csirazas35c", title: "35℃", type: "numeric", width: 30 },
				{ name: "csirazas40c", title: "40℃", type: "numeric", width: 30 },
				{
					name: "optialisCsirazas",
					title: "Optiomalis csírázás",
					unit: "nap",
					calculate: function (csirazas5c, csirazas10c, csirazas15c, csirazas20c, csirazas25c, csirazas30c, csirazas35c, csirazas40c) {
						var values = _.filter(arguments, function (value) {
							return !!value.value();
						});
						if (values.length > 0) {
							return Math.min.apply(null, values.map(function (value) { return value.asNumber(); }));
						} else {
							return null;
						}
					}
				},
				{ name: "magPerGramm", title: "Magok száma" },
				{ name: "palantazasIdeje", title: "Palántázás ideje", unit: "hét" }
			],
			items: {
				toString: function () {
					return this.get("nev");
				}
			}
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
