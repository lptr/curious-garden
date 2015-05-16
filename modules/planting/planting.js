(function () {
	var transactionModule = angular.module("kapa.planting", [
		"kapa.services",
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

	transactionModule.controller("PlantingController", function ($scope, kapaServer) {
		var afterChange = function (event) {
			console.log("Event", event);
		}
		
		var suffixRenderer = function (suffix) {
			return function (instance, td, row, col, prop, value, cellProperties) {
				Handsontable.renderers.NumericRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);
				if (td.textContent) {
					td.textContent += suffix;
				}
			};
		};

		$scope.settings = {
			colHeaders: true,
			rowHeaders: false,
			contextMenu: ['row_above', 'row_below', 'remove_row'],
			afterChange: afterChange,
			minSpareRows: 1,
			height: 300,
			width: 700,
			columns: [
				{ type: "text", title: "ID", data: "id", readOnly: true },
				{ type: "text", title: "Terménynév", data: "name" },
				{ type: "text", title: "Szín", data: "color" },
				{ type: "date", title: "Dátum", data: "time", dateFormat: "YYYY-MM-DD" },
				{ type: "numeric", title: "Magok száma", data: "seedsPerGramm", format: "0.00", renderer: suffixRenderer(" db/g")},
			]
		};
		$scope.items = [
			{ id: 1, name: "Zsázsa", color: "Blue", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, name: "Mizuna", color: "Zöld", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
	});
})();
