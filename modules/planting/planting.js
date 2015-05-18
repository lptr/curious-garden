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
		$scope.items = [];
		var suffixRenderer = function (suffix) {
			return function (instance, td, row, col, prop, value, cellProperties) {
				Handsontable.renderers.NumericRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);
				if (td.textContent) {
					td.textContent += suffix;
				}
			};
		};
		
		var Property = function (options) {
			$.extend(this, { readOnly: !!options.recalcuate }, options);
		};
		Property.prototype.value = function (item) {
			return item[this.property];
		};
		Property.prototype.hasValue = function (item) {
			return !!item[this.property];
		};
		Property.prototype.asNumber = function (item) {
			var value = this.value(item);
			return typeof value === 'number' ? value : 0;
		};
		Property.prototype.asText = function (item) {
			var value = this.value(item);
			return typeof value === 'string' ? value : "";
		};
		Property.prototype.toProperty = function () {
			return function (item, value) {
				if (typeof value === 'undefined') {
					return this.get(item);
				} else {
					return this.set(item, value);
				}
			}.bind(this);
		};
		Property.prototype.recalcuate = function () {};

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
			this.set(item, json ? json[this.property] : null);
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
			this.data.forEach (function (datum) {
				var id = datum[this.idField];
				var name = datum[this.nameField];
				this.idLookup[id] = datum;
				this.nameLookup[name] = datum;
			}, this);
		};
		ReferenceProperty.prototype = Object.create(Property.prototype);
		ReferenceProperty.renderer = function (instance, td, row, col, prop, displayValue, cellProperties) {
			Handsontable.renderers.NumericRenderer.apply(null, [instance, td, row, col, prop, displayValue, cellProperties]);
			var value = this.value(row);
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
			if (value === null || value === "") {
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
			var value = json ? json[this.property] : null;
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
		
		var Item = function (table, options) {
			$.extend(this, {}, options);
			table.properties.forEach(function (property) {
				property.recalcuate(this);
			}, this);
		};
		Item.prototype.value = function (property) {
			return property.value(this);
		};
		Item.prototype.hasValue = function (property) {
			return property.hasValue(this);
		};
		Item.prototype.asNumber = function (property) {
			return property.asNumber(this);
		}
		Item.prototype.asText = function (property) {
			return property.asText(this);
		}
		var Table = function (options) {
			$.extend(this, {
				data: [],
				properties: []
			}, options);
			var dataProperties = this.properties.slice();
			var assignId = function (item) {
				var hasId = item.hasValue(this.id);
				var hasSomeValues = dataProperties.some(function (property) { return item.hasValue(property); });
				if (!hasId && hasSomeValues) {
					this.id.set(item, 123);
				} else if (hasId && !hasSomeValues) {
					this.id.set(item, null);
				}
			}.bind(this);
			this.id = new SimpleProperty({ property: "id", title: "ID", readOnly: true, column: { className: "htCenter" }, recalcuate: assignId });
			this.properties.unshift(this.id);
			var table = this;
			this.Item = function (json) {
				var values = {};
				table.properties.forEach(function (property) {
					property.fromJson(values, json);
				});
				Item.apply(this, [table, values]);
			};
			this.Item.prototype = Object.create(Item.prototype);
		};
		Table.prototype.toSettings = function () {
			var self = this;
			var afterChange = function (changes, source) {
				console.log("Event", arguments);
				// Don't do stuff when loading
				if (source === "loadData") {
					return;
				}
				var rows = {};
				changes.forEach(function (change) {
					var rowNo = change[0];
					if (!rows[rowNo]) {
						rows[rowNo] = true;
						var row = self.data[rowNo];
						if (row) {
							self.properties.forEach(function (property) {
								property.recalcuate(row);
							});
						}
					}
				});
				this.render();
			};
			
			return $.extend({}, this.settings, {
				data: this.data,
				dataSchema: function () { return new this.Item({}); }.bind(this),
				afterChange: afterChange,
				columns: this.properties.map(function (property) { return property.toColumn(); })
			});
		};
		Table.prototype.load = function (itemsJson) {
			// Clear the array
			this.data.length = 0;
			itemsJson.forEach(function (itemJson) {
				this.data.push(new this.Item(itemJson));
			}, this);
		};
		
		var produces = [
			{ id: 1, name: "Zsázsa", rowWidth: 15 },
			{ id: 2, name: "Mizuna", rowWidth: 12 },
		];
		var plantations = [
			{ id: 1, produce: 1, seed: "Zsázsamag", time: "2015-05-13", seedsPerGramm: 4 },
			{ id: 2, produce: 2, seed: "Mizunamag", time: "2015-05-17", seedsPerGramm: 0.25 },
		];
		
		var produceProp = new ReferenceProperty({ property: "produce", title: "Termény", data: produces });
		var seedProp = new SimpleProperty({ property: "seed", title: "Mag" });
		var timeProp = new SimpleProperty({ property: "time", title: "Dátum", type: "date", column: { dateFormat: "YYYY-MM-DD" } });
		var seedCountProp = new SimpleProperty({ property: "seedsPerGramm", title: "Magok száma", type: "numeric", column: { format: "0.00", renderer: suffixRenderer(" db/g") } });
		var seedCountPropPlus1 = new SimpleProperty({ property: "seedsPerGrammPlus1", title: "Magok száma + 1", type: "numeric", column: { format: "0.00", renderer: suffixRenderer(" db/g") }, recalcuate: function (item) {
			if (item.hasValue(seedCountProp)) {
				this.set(item, item.asNumber(seedCountProp) + 1);
			} else {
				this.set(item, null);
			}
		} });
		
		var plantingTable = new Table({
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
