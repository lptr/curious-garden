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

	plantingModule.factory("producesTable", function (tables, $http) {
		var producesTable = new tables.Table({
			name: "produces",
			properties: [
				new tables.SimpleProperty({
			        name: "name",
			        title: "Név",
			    }),
				new tables.SimpleProperty({
					name: "rowWidth",
					title: "Sorköz",
					type: "numeric"
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
				contextMenu: ['row_above', 'row_below', 'remove_row'],
				minSpareRows: 1,
				height: 300,
				width: 700,
			}
		});
		// producesTable.load(produces);

		return producesTable;
	});

	plantingModule.factory("plantingTable", function (tables, producesTable, suffixRenderer) {
		var plantingTable = new tables.Table({
			name: "plantings",
			properties: [
			    new tables.ReferenceProperty({
					name: "produce",
			        title: "Termény",
			        target: producesTable
			    }),
			    new tables.SimpleProperty({
					name: "seed",
			        title: "Mag"
			    }),
			    new tables.SimpleProperty({
					name: "time",
			        title: "Dátum",
			        type: "date",
			        column: {
			            dateFormat: "YYYY-MM-DD"
			        }
			    }),
			    new tables.SimpleProperty({
					name: "seedsPerGramm",
			        title: "Magok száma",
			        type: "numeric",
			        column: {
			            format: "0.00",
			            renderer: suffixRenderer(" db/g")
			        }
			    }),
			    new tables.SimpleProperty({
					name: "seedsPerGrammPlus1",
			        title: "Magok száma + 1",
			        type: "numeric",
			        column: {
			            format: "0.00",
			            renderer: suffixRenderer(" db/g")
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
					column: { format: "0.00" },
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
				contextMenu: ['row_above', 'row_below', 'remove_row'],
				minSpareRows: 1,
				height: 300,
				width: 700,
			}
		});

		return plantingTable;
	});

	plantingModule.controller("ProducesController", function ($scope, kapaServer, producesTable) {
		producesTable.link($("#producesTable"));
		producesTable.fetch();
		$scope.add = function () {
			producesTable.addItem();
		};
		$scope.dump = function () {
			console.log("Data:", producesTable.items);
		};
	});

	plantingModule.controller("PlantingController", function ($scope, kapaServer, plantingTable) {
		plantingTable.link($("#plantingTable"));
		plantingTable.fetch();
		$scope.dump = function () {
			console.log("Data:", plantingTable.items);
		};
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
