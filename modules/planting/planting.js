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
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];

		var serverUrl = "https://script.google.com/macros/s/AKfycbw5ogvZt6Gt-h8cjd2y0a8HHD8FLfItErvspkaop6o/dev";
		var fetch = function (table) {
			return function (options) {
				console.log("Fetching", table);
				var collection = this;
				var request = $http.jsonp(serverUrl, {
					params: {
						method: "fetch",
						table: table,
						callback: "JSON_CALLBACK"
					}
				});
				request.error(function(data, status, headers, config) {
					console.log("Error", data, status, headers, config);
					alert("Error: " + status);
				})
				.success(function (data) {
					console.log(data);
					// set collection data (assuming you have retrieved a json object)
					collection.reset(data)
				});
				return request;
			};
		};

		Backbone.sync = function (method, model, options) {
			console.log("Sync called with ", method, model, options);
			var request = $http.jsonp(serverUrl, {
				params: {
					method: method,
					table: model.getTableName(),
					id: model.id,
					item: model.toJSON(),
					callback: "JSON_CALLBACK"
				}
			});
			request.success(options.success);
			request.error(options.error)
			return request;
		};

		var Produce = window.Produce = Backbone.RelationalModel.extend({
			getTableName: function () { return "produces"; }
		});
		var Produces = window.Produces = Backbone.Collection.extend({
			model: Produce,
			fetch: fetch("produces")
		});
		var produces = window.produces = new Produces();
		produces.fetch().success(function (data) {
			var Planting = window.Planting = Backbone.RelationalModel.extend({
				getTableName: function () { return "plantings"; },
				relations: [{
					type: Backbone.HasOne,
					key: "produce",
					relatedModel: "Produce",
				}]
			});
			var Plantings = window.Plantings = Backbone.Collection.extend({
				model: Planting,
				fetch: fetch("plantings")
			});
			var plantings = window.plantings = new Plantings();
			plantings.fetch();
		});
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
			settings: {
				colHeaders: true,
				rowHeaders: true,
				contextMenu: ['row_above', 'row_below', 'remove_row'],
				minSpareRows: 1,
				height: 300,
				width: 700,
			}
		});
		producesTable.load(produces);

		return producesTable;
	});

	plantingModule.factory("plantingTable", function (tables, producesTable, suffixRenderer) {
		var plantingTable = new tables.Table({
			name: "planting",
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
			                return produce.value().rowWidth;
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
			                return produce.value().name.toUpperCase();
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
		var plantations = [
			{ id: 1, produce: 1, seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: 2, seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];

		plantingTable.reload = function () {
			plantingTable.load(plantations);
		};
		plantingTable.reload();

		return plantingTable;
	});

	plantingModule.controller("ProducesController", function ($scope, kapaServer, producesTable) {
		producesTable.link($("#producesTable"));
		$scope.dump = function () {
			console.log("Data:", producesTable.data);
		};
	});

	plantingModule.controller("PlantingController", function ($scope, kapaServer, plantingTable) {
		plantingTable.link($("#plantingTable"));
		$scope.dump = function () {
			console.log("Data:", plantingTable.data);
		};
	});
})();
