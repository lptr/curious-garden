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
				templateUrl: 'modules/planting/planting.html',
				controller: 'PlantingController'
			});
	});
	
	plantingModule.factory("fajok", function (tables) {
		return new tables.Table({
			name: "Fajok",
			properties: [
				{ name: "nev", title: "Név" },
				{ name: "name", title: "Name" },
				{ name: "csoport", title: "Növénytani csoport" },
				{ name: "optimalisHomerseklet", title: "Optimális hőmérséklet", type: "numeric", unit: "℃" },
				{ name: "csirazas5c",  title: "5℃",  column: { width: 30 } },
				{ name: "csirazas10c", title: "10℃", column: { width: 30 } },
				{ name: "csirazas15c", title: "15℃", column: { width: 30 } },
				{ name: "csirazas20c", title: "20℃", column: { width: 30 } },
				{ name: "csirazas25c", title: "25℃", column: { width: 30 } },
				{ name: "csirazas30c", title: "30℃", column: { width: 30 } },
				{ name: "csirazas35c", title: "35℃", column: { width: 30 } },
				{ name: "csirazas40c", title: "40℃", column: { width: 30 } },
				{ name: "optialisCsirazas", title: "Optiomalis csírázás", recalculate: function () {
					return 12;
				}},
				{ name: "magPerGramm", title: "Magok száma" },
				{ name: "palantazasIdeje", title: "Palántázás ideje" }
			]
		});
	});

	plantingModule.factory("producesTable", function (tables) {
		return new tables.Table({
			name: "produces",
			properties: [
				new tables.SimpleProperty({
			        name: "name",
			        title: "Név",
					column: {
						width: 200
					}
			    }),
				new tables.SimpleProperty({
					name: "rowWidth",
					title: "Sorköz",
					type: "numeric",
					column: {
						width: 60
					}
				})
			],
			items: {
				toString: function () {
					return this.get("name");
				}
			},
			settings: {
				colHeaders: true,
				rowHeaders: true,
				height: 300,
				width: 700,
			}
		});
	});

	plantingModule.factory("plantingTable", function (tables, producesTable, prefixSuffixRenderer) {
		var plantingTable = new tables.Table({
			name: "plantings",
			// hideId: true,
			properties: [
			    new tables.ReferenceProperty({
					name: "produce",
			        title: "Termény",
			        target: producesTable,
					column: { width: 200 }
			    }),
			    new tables.SimpleProperty({
					name: "seed",
			        title: "Mag",
					column: { width: 100 }
			    }),
			    new tables.SimpleProperty({
					name: "time",
			        title: "Dátum",
			        type: "date",
			        column: {
			            dateFormat: "YYYY-MM-DD",
						width: 120
			        }
			    }),
			    new tables.SimpleProperty({
					name: "seedsPerGramm",
			        title: "Magok száma",
			        type: "numeric",
			        column: {
			            format: "0.00",
			            renderer: prefixSuffixRenderer("", " db/g"),
						width: 100
			        }
			    }),
			    new tables.SimpleProperty({
					name: "seedsPerGrammPlus1",
			        title: "Magok száma + 1",
			        type: "numeric",
			        column: {
			            format: "0.00",
			            renderer: prefixSuffixRenderer("", " db/g"),
						width: 100
			        },
			        recalculate: function(seedsPerGramm) {
			            if (seedsPerGramm.hasValue()) {
			                return seedsPerGramm.asNumber() + 1;
			            } else {
			                return null;
			            }
			        }
			    }),
				new tables.SimpleProperty({
					name: "produceSorkoz",
			        title: "Sorkoz",
					type: "numeric",
					column: {
						format: "0.00",
						width: 100
					},
			        recalculateDefault: function (produce) {
			            if (produce.hasValue()) {
			                return produce.value().get("rowWidth");
			            } else {
			                return null;
			            }
			        }
			    }),
				new tables.SimpleProperty({
					name: "produceUpper",
			        title: "TERMÉNY",
					column: {
						width: 200
					},
			        recalculate: function (produce) {
			            if (produce.hasValue()) {
			                return produce.value().get("name").toUpperCase();
			            } else {
			                return null;
			            }
			        }
			    })
			],
			settings: {
				colHeaders: true,
				rowHeaders: true,
				height: 300,
				width: 700,
			}
		});

		return plantingTable;
	});

	plantingModule.controller("FajokController", function ($scope, kapaServer, fajok) {
		$scope.table = fajok;
	});

	plantingModule.controller("ProducesController", function ($scope, kapaServer, producesTable) {
		$scope.table = producesTable;
	});

	plantingModule.controller("PlantingController", function ($scope, kapaServer, plantingTable) {
		$scope.table = plantingTable;
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
