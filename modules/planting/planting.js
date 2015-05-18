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
		
		var Property = function (options) {
			$.extend(this, options);
		};
		Property.prototype.name = function () {
			return this.property;
		};
		Property.prototype.value = function (item) {
			return item[this.property];
		};
		Property.prototype.toProperty = function () {
			var self = this;
			return function (item, value) {
				if (typeof value === 'undefined') {
					return self.get(item);
				} else {
					return self.set(item, value);
				}
			};
		};
		
		var SimpleProperty = function (options) {
			Property.apply(this, arguments);
		}
		SimpleProperty.prototype = Object.create(Property.prototype);
		SimpleProperty.prototype.get = function (item) {
			return item[this.property];
		};
		SimpleProperty.prototype.set = function (item, value) {
			item[this.property] = value;
		}
		SimpleProperty.prototype.toJson = function (item, json) {
			json[this.property] = this.get(item);
		};
		SimpleProperty.prototype.fromJson = function (item, json) {
			this.set(item, json[this.property]);
		};
		SimpleProperty.prototype.toColumn = function () {
			return $.extend({}, this.column, {
				type: this.type || "text",
				title: this.title,
				data: this.toProperty(),
				readOnly: this.readOnly ? true : false
			});
		};

		var ReferenceProperty = function (options) {
			Property.apply(this, arguments);
			$.extend(this, {
				idField: "id",
				nameField: "name"
			});
			this.idLookup = {};
			this.nameLookup = {};
			var self = this;
			this.data.forEach (function (datum) {
				var id = datum[self.idField];
				var name = datum[self.nameField];
				self.idLookup[id] = datum;
				self.nameLookup[name] = datum;
			});
		};
		ReferenceProperty.prototype = Object.create(Property.prototype);
		ReferenceProperty.renderer = function (instance, td, row, col, prop, displayValue, cellProperties) {
			Handsontable.renderers.NumericRenderer.apply(null, [instance, td, row, col, prop, displayValue, cellProperties]);
			var value = this.value(row);
			console.log("Value:", value, "display value:", displayValue);
			if (value) {
				if (!value.id) {
					td.color = "red";
				} else {
					td.title = "ID: " + value.id;
				}
			}
			return td;
		};
		ReferenceProperty.prototype.get = function (item) {
			var value = item[this.property];
			// console.log("Item: ", item, " value: ", value);
			return value ? value[this.nameField] : null;
		};
		ReferenceProperty.prototype.set = function (item, value) {
			var ref;
			if (value === null) {
				ref = null;
			} else if (typeof value === 'string') {
				ref = this.nameLookup[value];
				if (!ref) {
					ref = {};
					ref[this.idField] = null;
					ref[this.nameField] = value;
				}					
			} else {
				ref = value;
			}
			// console.log(">>> SET", item, ref);
			item[this.property] = ref;
		};
		ReferenceProperty.prototype.toJson = function (item, json) {
			json[this.property] = this.get(item);
		};
		ReferenceProperty.prototype.fromJson = function (item, json) {
			var value = json[this.property];
			this.set(item, value ? this.idLookup[value] : null);
		};
		ReferenceProperty.prototype.toColumn = function () {
			return $.extend({}, this.column, {
				type: "dropdown",
				source: this.data.map(function (datum) { return datum.name; }),
				title: this.title,
				data: this.toProperty(),
				renderer: ReferenceProperty.renderer.bind(this)
			});
		};
		
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];
		var plantations = [
			{ id: 1, produce: 1, seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: 2, seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
		
		var idProp = new SimpleProperty({ property: "id", title: "ID", readOnly: true });
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
