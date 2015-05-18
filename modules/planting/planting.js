(function () {
	var transactionModule = angular.module("kapa.planting", [
		"kapa.services",
		"kapa.utils.tables",
		"ngRoute",
		"ngHandsontable",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	transactionModule.config(function ($routeProvider) {
		$routeProvider
			.when('/planting', {
				templateUrl: 'modules/planting/planting.html',
				controller: 'PlantingController'
			});
	});

	transactionModule.controller("PlantingController", function ($scope, kapaServer, tables, suffixRenderer) {
		$scope.items = [];
		
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];
		var plantations = [
			{ id: 1, produce: 1, seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: 2, seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
		
		var produceProp = new tables.ReferenceProperty({ property: "produce", title: "Termény", data: produces });
		var seedProp = new tables.SimpleProperty({ property: "seed", title: "Mag" });
		var timeProp = new tables.SimpleProperty({ property: "time", title: "Dátum", type: "date", column: { dateFormat: "YYYY-MM-DD" } });
		var seedCountProp = new tables.SimpleProperty({ property: "seedsPerGramm", title: "Magok száma", type: "numeric", column: { format: "0.00", renderer: suffixRenderer(" db/g") } });
		var seedCountPropPlus1 = new tables.SimpleProperty({ property: "seedsPerGrammPlus1", title: "Magok száma + 1", type: "numeric", column: { format: "0.00", renderer: suffixRenderer(" db/g") }, recalculate: function (seedsPerGramm) {
			if (seedsPerGramm.hasValue()) {
				return seedsPerGramm.asNumber() + 1;
			} else {
				return null;
			}
		} });
		
		var plantingTable = new tables.Table({
			name: "planting",
			data: $scope.items,
			properties: [ produceProp, seedProp, timeProp, seedCountProp, seedCountPropPlus1 ],
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
