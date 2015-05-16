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
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];
		var plantations = [
			{ id: 1, produce: "Zsázsa", seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: "Mizuna", seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
		$scope.items = plantations;

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
		
		var property = function (get, set) {
			return function (item, value) {
				if (typeof value === 'undefined') {
					return get.apply({}, [item]);
				} else {
					return set.apply({}, [item, value]);
				}
			}
		}
		
		var LookupProperty = function (options) {
			var nameField = options.name;
			var idField = options.id || nameField + "Id";

			var lookup = {};
			options.data.forEach (function (datum) {
				var id = datum["id"];
				var name = datum["name"];
				lookup[name] = datum;
			});

			this.get = function (item) {
				return item[nameField];
			};
			this.set = function (item, name) {
				item[nameField] = name;
				var value = lookup[name];
				item[idField] = value ? value.id : null;
			};
			this.renderer = function (instance, td, row, col, prop, name, cellProperties) {
				Handsontable.renderers.NumericRenderer.apply(this, [instance, td, row, col, prop, name, cellProperties]);
				var value = lookup[name];
				if (!value) {
					td.color = "red";
				} else {
					td.title = "ID: " + value.id;
				}
				return td;
			};
			this.toColumn = function () {
				return {
					type: "dropdown",
					source: options.data.map(function (datum) { return datum.name; }),
					title: options.title,
					data: property(this.get, this.set),
					renderer: this.renderer
				};
			};
		}
		
		var produceProp = new LookupProperty({ name: "produce", title: "Termény", data: produces });

		var columns = [
			{ type: "text", title: "ID", data: "id", readOnly: true },
			produceProp.toColumn(),
			{ type: "text", title: "Mag", data: "seed", hidden: true },
			{ type: "date", title: "Dátum", data: "time", dateFormat: "YYYY-MM-DD" },
			{ type: "numeric", title: "Magok száma", data: "seedsPerGramm", format: "0.00", renderer: suffixRenderer(" db/g")},
		];

		$scope.settings = {
			colHeaders: true,
			rowHeaders: false,
			contextMenu: ['row_above', 'row_below', 'remove_row'],
			afterChange: afterChange,
			minSpareRows: 1,
			height: 300,
			width: 700,
			columns: columns.filter(function (column) { return !column.hidden; })
		};
	});
})();
