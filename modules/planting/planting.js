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
		
		var makeProperty = function (get, set) {
			return function (item, value) {
				if (typeof value === 'undefined') {
					return get.apply({}, [item]);
				} else {
					return set.apply({}, [item, value]);
				}
			}
		}
		
		var SimpleProperty = function (options) {
			var property = options.property;
			
			this.name = function () {
				return property;
			};
			this.get = function (item) {
				return item[property];
			};
			this.set = function (item, value) {
				item[property] = value;
			}
			this.toJson = function (item, json) {
				json[property] = this.get(item);
			};
			this.fromJson = function (item, json) {
				this.set(item, json[property]);
			};
			this.toColumn = function () {
				return $.extend({}, options.column, {
					type: options.type || "text",
					title: options.title,
					data: makeProperty(this.get, this.set),
					readOnly: options.readOnly ? true : false
				});
			};
		};

		var ReferenceProperty = function (options) {
			var property = options.property;
			var idField = options.id || "id";
			var nameField = options.name || "name";

			var idLookup = {};
			var nameLookup = {};
			options.data.forEach (function (datum) {
				var id = datum[idField];
				var name = datum[nameField];
				idLookup[id] = datum;
				nameLookup[name] = datum;
			});

			var renderer = function (instance, td, row, col, prop, value, cellProperties) {
				Handsontable.renderers.NumericRenderer.apply(this, [instance, td, row, col, prop, value ? value[nameField] : null, cellProperties]);
				if (value) {
					if (!value.id) {
						td.color = "red";
					} else {
						td.title = "ID: " + value.id;
					}
				}
				return td;
			};

			this.name = function () {
				return property;
			};
			this.get = function (item) {
				var value = item[property];
				console.log("Item: ", item, " value: ", value);
				return value;
			};
			this.set = function (item, value) {
				var ref;
				if (value === null) {
					ref = null;
				} else if (typeof value === 'string') {
					ref = nameLookup[value];
					if (!ref) {
						ref = {};
						ref[idField] = null;
						ref[nameField] = value;
					}					
				} else {
					ref = value;
				}
				console.log(">>> SET", item, ref);
				item[property] = ref;
			};
			this.toJson = function (item, json) {
				json[property] = this.get(item);
			};
			this.fromJson = function (item, json) {
				var value = json[property];
				this.set(item, value ? idLookup[value] : null);
			};
			this.toColumn = function () {
				return $.extend({}, options.column, {
					type: "dropdown",
					source: options.data.map(function (datum) { return datum.name; }),
					title: options.title,
					data: makeProperty(this.get, this.set),
					renderer: renderer
				});
			};
		}
		
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];
		var plantations = [
			{ id: 1, produce: 1, seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: 2, seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
		
		var idProp = new SimpleProperty({ property: "id", title: "ID" });
		var produceProp = new ReferenceProperty({ property: "produce", title: "Termény", data: produces });
		var seedProp = new SimpleProperty({ property: "seed", title: "Mag" });
		var timeProp = new SimpleProperty({ property: "time", title: "Dátum", type: "date", column: { dateFormat: "YYYY-MM-DD" } });
		var seedCountProp = new SimpleProperty({ property: "seedsPerGramm", title: "Magok száma", type: "numeric", column: { format: "0.00", renderer: suffixRenderer(" db/g") } });

		var properties = [ idProp, produceProp, seedProp, timeProp, seedCountProp ];
		var dataSchema = {};
		properties.forEach(function (property) {
			dataSchema[property] = property.name();
		});
		var columns = properties.map(function (property) { return property.toColumn(); });

		$scope.settings = {
			colHeaders: true,
			rowHeaders: false,
			contextMenu: ['row_above', 'row_below', 'remove_row'],
			afterChange: afterChange,
			minSpareRows: 1,
			height: 300,
			width: 700,
			columns: columns,
			dataSchema: dataSchema
		};

		var reload = function () {
			$scope.items = [];
			plantations.forEach(function (plantation) {
				item = {};
				properties.forEach(function (property) {
					return property.fromJson(item, plantation);
				});
				$scope.items.push(item);
			});
		};
		reload();
	});
})();
