(function () {
	var plantingModule = angular.module("kapa.planting", [
		"kapa.services",
		"kapa.utils.tables",
		"ngRoute",
		"ngHandsontable",
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

	plantingModule.controller("PlantingController", function ($scope, kapaServer, tables, suffixRenderer) {
		$scope.items = [];
		
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];
		var plantations = [
			{ id: 1, produce: 1, seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: 2, seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
		
		var producesTable = new tables.Table({
			name: "produces",
			properties: [
				new tables.SimpleProperty({
			        property: "name",
			        title: "Név",
			    }),
				new tables.SimpleProperty({
					property: "rowWidth",
					title: "Sorköz",
					type: "numeric"
				})
			]
		});
		producesTable.load(produces);
		
		var plantingTable = new tables.Table({
			name: "planting",
			data: $scope.items,
			properties: [
			    new tables.ReferenceProperty({
			        property: "produce",
			        title: "Termény",
			        target: producesTable
			    }),
			    new tables.SimpleProperty({
			        property: "seed",
			        title: "Mag"
			    }),
			    new tables.SimpleProperty({
			        property: "time",
			        title: "Dátum",
			        type: "date",
			        column: {
			            dateFormat: "YYYY-MM-DD"
			        }
			    }),
			    new tables.SimpleProperty({
			        property: "seedsPerGramm",
			        title: "Magok száma",
			        type: "numeric",
			        column: {
			            format: "0.00",
			            renderer: suffixRenderer(" db/g")
			        }
			    }),
			    new tables.SimpleProperty({
			        property: "seedsPerGrammPlus1",
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
			    })
			],
			settings: {
				colHeaders: true,
				rowHeaders: false,
				contextMenu: ['row_above', 'row_below', 'remove_row'],
				minSpareRows: 1,
				height: 300,
				width: 700,				
			}
		});
		$scope.settings = plantingTable.toSettings();

		var reload = function () {
			plantingTable.load(plantations);
		};
		reload();
	});
})();
