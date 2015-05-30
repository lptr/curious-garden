(function () {
	var tablesModule = angular.module("kapa.utils.tables", [
		"ui.bootstrap",
	]);
	
	tablesModule.factory("formulas", function (tables) {
		var mapOverNumbers = function (items, defaultValue, fun) {
			var result = NaN;
			for (var idx = 0, len = items.length; idx < len; idx++) {
				var value = items[idx];
				if (value instanceof tables.ItemProperty) {
					value = value.asNumber();
				}
				if (!isNaN(value) && value !== null) {
					if (isNaN(result)) {
						result = value;
					} else {
						result = fun.call(null, result, value);
					}
				}
			}
			if (isNaN(result)) {
				return defaultValue;
			} else {
				return result;
			}
		}
		return {
			join: function (items, deliminator) {
				var result = "";
				for (var idx = 0, len = items.length; idx < len; idx++) {
					var value = items[idx];
					if (value instanceof tables.ItemProperty) {
						value = value.value();
					}
					if (!value) {
						continue;
					}
					if (typeof value !== 'string') {
						value = value.toString();
					}
					if (result === "") {
						result = value;
					} else {
						result += (deliminator || ", ") + value;
					}
				}
				return result;
			},
			min: function (items) {
				return mapOverNumbers(items, null, Math.min);
			},
			max: function (items) {
				return mapOverNumbers(items, null, Math.max);
			},
			addDays: function (date, days) {
				if (days instanceof tables.ItemProperty) {
					days = days.asNumber();
				}
				if (typeof days !== 'number') {
					return null;
				}

				if (date instanceof tables.ItemProperty) {
					date = date.asDate();
				}
				if (typeof date === 'string') {
					date = new Date(date);
				}
				if (!(date instanceof Date) || isNaN(date)) {
					return null;
				}

				var result = new Date(date.valueOf());
				result.setDate(date.getDate() + days);
				return result;
			}
		};
	});

	var serverUrl = "https://script.google.com/macros/s/AKfycbw5ogvZt6Gt-h8cjd2y0a8HHD8FLfItErvspkaop6o/dev";
	tablesModule.factory("backboneSync", function ($http) {
		return function (method, model, options) {
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
	});
	
	tablesModule.factory("itemFetcher", function ($http) {
		return function (table, options) {
			var fetchStart = new Date().getTime();
			console.log("Fetching", table.name);
			var request = $http.jsonp(serverUrl, {
				params: {
					method: "fetch",
					table: table.name,
					callback: "JSON_CALLBACK"
				}
			});
			request.error(function(data, status, headers, config) {
				console.log("Error", data, status, headers, config);
				alert("Error: " + status);
			});
			request.success(function (data) {
				var fetchEnd = new Date().getTime();
				console.log("Data fetched for", table.name, "in", fetchEnd - fetchStart, "ms");
			});
			request.success(options.success);
			request.error(options.error);
			return request;
		};
	});

    tablesModule.factory("prefixSuffixRenderer", function () {
        return function (prefix, suffix) {
            return function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(null, arguments);
                if (td.textContent) {
                    td.textContent = prefix + td.textContent + suffix;
                }
            };
        };
    });
	
	tablesModule.factory("changeTracking", function () {
		var changeTracking = {
			operationStartListeners: [],
			operationSuccessListeners: [],
			operationFailureListeners: []
		};
		
		var pendingChanges = null;
		changeTracking.start = function () {
			console.log(">>> Started change tracking");
			pendingChanges = {};
		};
		var register = function(item, operation) {
			if (pendingChanges !== null) {
				console.log("--- Storing changed", item);
				var changedId = item.getTableName() + ":" + item.id;
				pendingChanges[changedId] = {
					item: item,
					operation: operation
				};
			} else {
				// console.log("--! Ignoring change", item);
				throw new Error("Change not recorded: " + JSON.stringify(item.toJSON()));
			}
		};
		changeTracking.registerChange = function (item) {
			register(item, function () {
				return item.save();
			});
		};
		changeTracking.registerRemove = function (item) {
			register(item, function () {
				return item.destroy();
			});
		};
		changeTracking.finish = function () {
			if (pendingChanges === null) {
				return;
			}
			console.log("<<< Finished change tracking", pendingChanges);
			var callListeners = function (listeners, item) {
				for (var idx = 0, len = listeners.length; idx < len; idx++) {
					listeners[idx](item);
				}
			}
			try {
				console.log("=== Changes to save", pendingChanges);
				_.values(pendingChanges).forEach(function (change) {
					var item = change.item;
					var operation = change.operation;
					callListeners(changeTracking.operationStartListeners, item);
					operation().then(function (result) {
						console.log("Successfully saved", item, result);
						callListeners(changeTracking.operationSuccessListeners, item);
					}, function (reason) {
						console.log("Failed to save", item, reason);
						callListeners(changeTracking.operationFailureListeners, item);
					});					
				});
			} finally {
				pendingChanges = null;
			}
		};

		return changeTracking;
	});

    tablesModule.factory("tables", function (itemFetcher, backboneSync, changeTracking, prefixSuffixRenderer) {
        var tables = {};
		
		var Property = function (options) {
            _.extend(this,
				{
					hidden: false,
					readOnly: !!options.calculate
				},
				options);
        };
		Property.prototype.toProperty = function () {
			var name = this.name;
			return function (item, value) {
                if (typeof value === 'undefined') {
                    return item.value(name);
                } else {
                    return item.set(name, value);
                }
            };
		};
        tables.Property = Property;

        var SimpleProperty = function (options) {
            Property.call(this, _.extend({ type: "text" }, options));
        };
		SimpleProperty.prototype = Object.create(Property.prototype);
		SimpleProperty.prototype.toColumn = function () {
			var column = _.extend({
				width: this.width || 100,
			}, this.column, {
				type: this.type,
				title: this.title,
				data: this.toProperty(),
				readOnly: this.readOnly ? true : false
			});
			if (this.unit) {
				column.type = "numeric";
				var unit = this.unit;
				if (unit.indexOf(" ") == -1) {
					unit = "\xA0" + unit;
				} else {
					unit = unit.replace(/\s/g, "\xA0");
				}
				column.renderer = prefixSuffixRenderer("", unit);
			}
			return column;
		};
        tables.SimpleProperty = SimpleProperty;

		var IdProperty = function (options) {
			SimpleProperty.call(this, _.extend({}, options, {
				type: "numeric",
				readOnly: true
			}));
		}
		IdProperty.prototype = Object.create(SimpleProperty.prototype);
		IdProperty.prototype.toColumn = function () {
			var column = SimpleProperty.prototype.toColumn.call(this);
			var self = this;
			column.renderer = function (instance, td, row, col, prop, id, cellProperties) {
				var value = id ? self.table.items.get(id) : null;
				var displayValue = value ? value.toIdString() : id;
				Handsontable.renderers.TextRenderer.call(null, instance, td, row, col, prop, displayValue, cellProperties);
			};
			return column;
		};

        var ReferenceProperty = function (options) {
			var self = this;
            SimpleProperty.apply(this, arguments);

			var AutocompleteEditor = Handsontable.editors.AutocompleteEditor;
			var ReferenceEditor = this.ReferenceEditor = AutocompleteEditor.prototype.extend();
			ReferenceEditor.prototype.prepare = function(row, col, prop, td, originalId, cellProperties) {
				var originalItem = self.target.items.get(originalId);
				var originalValue = originalItem ? originalItem.toString() : null;
				AutocompleteEditor.prototype.prepare.call(this, row, col, prop, td, originalValue, cellProperties);
			};
			ReferenceEditor.prototype.saveValue = function(values, ctrlDown) {
				var ids = values.map(function (valueRow) {
					return valueRow.map(function (value) {
						if (!value) {
							return null;
						}
						var item = self.target.items.find(function (item) {
							return item.toString() === value;
						});
						return item ? item.id : null;
					});
				});
				return AutocompleteEditor.prototype.saveValue.call(this, ids, ctrlDown);
			};

        };
        ReferenceProperty.prototype = Object.create(Property.prototype);
		ReferenceProperty.prototype.toColumn = function () {
			var self = this;
			var column = SimpleProperty.prototype.toColumn.apply(this, arguments);
			return _.extend(column, this.column, {
                type: "autocomplete",
				strict: true,
				validator: null,
				editor: this.ReferenceEditor,
				source: function (query, process) {
					process(self.target.items.map(function (item) {
						return item.toString() || "";
					}));
				},
                title: this.title,
                data: this.toProperty(),
				renderer: function (instance, td, row, col, prop, id, cellProperties) {
					var value = self.target.items._byId[id];
					var displayValue = value ? value.toString() : null;
					Handsontable.renderers.AutocompleteRenderer.call(null, instance, td, row, col, prop, displayValue, cellProperties);
				}
            });
		};
		ReferenceProperty.prototype.toProperty = function () {
			var self = this;
			return function (item, value) {
                if (typeof value === 'undefined') {
					var result = item.value(self.name);
                    return result ? result.id : result;
                } else {
					var ref = value ? self.target.items.get(value) : null;
                    return item.set(self.name, ref);
                }
            };
		};
        tables.ReferenceProperty = ReferenceProperty;

		var Item = Backbone.RelationalModel.extend({
			constructor: function () {
				this.defaultValues = {};
				Backbone.RelationalModel.apply(this, arguments);
			},
			defaultValue: function (property) {
				return this.defaultValues[property];
			},
			setDefaultValue: function (property, value, options) {
				this.defaultValues[property] = value;
			},
			value: function (property) {
				var value = this.get(property);
				if (!value) {
					value = this.defaultValue(property);
				}
	            return value;
	        },
			hasValue: function (property) {
				return this.has(property) || this.hasDefaultValue(property);
			},
			hasDefaultValue: function (property) {
				return this.defaultValues[property] !== null;
			},
			asNumber: function (property) {
				var value = this.value(property);
	            return typeof value === 'number' ? value : NaN;
			},
			asDate: function (property) {
				var value = this.value(property);
				if (typeof value !== 'string') {
					return null;
				}
	            return new Date(value);
			},
			asText: function (property) {
				var value = this.value(property);
				if (!value) {
					return "";
				}
	            return value.toString();
			},
			toIdString: function () {
				return this.id ? this.id.toString() : null;
			},
			toString: function () {
				return this.toIdString();
			}
		});
		Object.defineProperty(Item.prototype, "length", {
			get: function () {
				return this.toString().length;
			}
		});

        var ItemProperty = function (item, property) {
            this.item = item;
            this.property = property;
        };
        ItemProperty.prototype.value = function () {
            return this.item.value(this.property);
        };
		ItemProperty.prototype.hasValue = function () {
            return this.item.has(this.property);
        };
		ItemProperty.prototype.isEmpty = function () {
            return !!this.item.has(this.property);
        };
		ItemProperty.prototype.hasExplicit = function () {
            return this.item.hasExplicit(this.property);
        };
        ItemProperty.prototype.asNumber = function () {
            return this.item.asNumber(this.property);
        };
		ItemProperty.prototype.asDate = function () {
            return this.item.asDate(this.property);
        };
		ItemProperty.prototype.asText = function () {
            return this.item.asText(this.property);
        };
		ItemProperty.prototype.get = function (subProperty) {
			var value = this.item.value(this.property);
			if (value instanceof Item) {
				return new ItemProperty(value, subProperty);
			} else {
				return null;
			}
		}
        tables.ItemProperty = ItemProperty;
		
		var TableState = {
			CREATED: 0,
			DEPENDENCIES_READY: 1,
			ITEMS_LOADED: 2,
			ITEMS_INITIALIZED: 3,
			READY: 4,
			FAILED: -1
		};
		tables.TableState = TableState;

        var Table = function (options) {
			options.properties = (options.properties || []).map(function (property) {
				if (property instanceof Property) {
					return property;
				} else {
					if (property.target) {
						return new ReferenceProperty(property);
					} else {
						return new SimpleProperty(property);
					}
				}
			});
			console.log("Options:", options);

			_.extend(this, {
				titleProperty: "id"
			}, options);

			var self = this;

			this.BackboneModel = Item.extend(_.extend({
				getTableName: function () {
					return self.name;
				},
				sync: backboneSync,
				relations: options.properties.filter(function (property) {
						return property instanceof ReferenceProperty;
					}).map(function (property) {
						return {
							type: Backbone.HasOne,
							key: property.name,
							relatedModel: property.target.BackboneModel,
							includeInJSON: "id"
						}
					}
				),
				toString: function () {
					var value = this.value(self.titleProperty);
					return value ? value.toString() : value;
				}
			}, options.items));
			var BackboneCollection = Backbone.Collection.extend({
				model: this.BackboneModel,
				splice: function (index, howMany) {
					var args = _.toArray(arguments).slice(2).concat({at: index}),
					removed = this.models.slice(index, index + howMany);
					this.remove(removed).add.apply(this, args);
					return removed;
				}
			});
			this.items = new BackboneCollection();
			
			// this.items.on("all", function () {
			// 	console.log("Backbone event", self.name, arguments);
			// });
			this.items.on("reset", function () {
				for (var idx = 0, len = self.items.length; idx < len; idx++) {
					self.recalculate(self.items.at(idx));
				}
				self.render.bind(self)();
			});

            var dataProperties = this.properties.slice();
            this.id = new IdProperty({
				name: "id",
				title: "ID",
				hidden: options.hideId,
				column: {
					className: "htCenter",
					width: 60
				},
				readOnly: true
			});
            this.properties.unshift(this.id);

            this.propertiesMap = {};
            this.properties.forEach(function (property) {
                self.propertiesMap[property.name] = property;
				property.table = this;
            }, this);

			var injectParameters = function (parameterNames, item) {
				var parameters = [];
				for (var idx = 0, len = parameterNames.length; idx < len; idx++) {
					var name = parameterNames[idx];
					var result;
					if (name === "item") {
						result = item;
					} else {
						var dependentProperty = self.propertiesMap[name];
						if (!dependentProperty) {
							throw new Error("Unknown property '" + name + "' for table '" + self.name + "'");
						}
						result = new ItemProperty(item, dependentProperty.name);
					}
					parameters.push(result);
				};
				return parameters;
			};
            this.recalculateProps = this.properties.map(function (property) {
				var injectRecalculator = function (calc) {
					if (typeof calc !== 'function') {
						return function () {};
					}
					var parameterNames = angular.injector.$$annotate(calc);
					return function (item, set) {
						var parameters = injectParameters(parameterNames, item);
						var value = calc.apply(property, parameters);
						if (typeof value !== 'undefined') {
	                    	set.call(item, property.name, value);
						}
					};
				};
				var recalculate = injectRecalculator(property.calculate);
				var recalculateDefault = injectRecalculator(property.calculateDefault);
				return function (item) {
					recalculateDefault(item, item.setDefaultValue);
					recalculate(item, item.set);
				};
            });
			
			var renderStart = NaN;
            this.settings = $.extend({
				height: 500
			}, this.settings, {
				beforeRender: function () {
					console.log("Rendered", arguments);
					renderStart = Date.now();
				},
				afterRender: function () {
					var renderEnd = Date.now();
					console.log("Rendered in", renderEnd - renderStart, "ms", arguments);
					renderStart = NaN;
				},
                data: this.items,
				// Without this a RangeError is thrown with columnSorting enabled
				observeChanges: false,
				columnSorting: true,
				// Without this we cannot press "delete rows" button outside
				outsideClickDeselects: false,
                dataSchema: function () { return new self.BackboneModel(); },
				beforeChange: changeTracking.start,
				afterChange: changeTracking.finish,
                columns: this.properties
					.filter(function (property) { return !property.hidden })
					.map(function (property) { return property.toColumn(); }),
				currentRowClassName: "currentRow",
				currentColClassName: "currentCol"
            });
			
			var initializeChangeTracking = function () {
				this.properties.forEach(function (property) {
					if (property instanceof ReferenceProperty) {
						property.target.items.on("change", function (changed, options) {
							var changedId = changed.id;
							this.items.forEach(function (item) {
								var ref = item.value(property.name);
								var refId = ref ? ref.id : null;
								if (refId === changedId) {
									this.recalculate(item);
								}
							}, this);
							this.render();
						}.bind(this));
						property.target.items.on("relational:remove", function (removed, options) {
							var removedId = removed.id;
							this.items.forEach(function (item) {
								var ref = item.value(property.name);
								var refId = ref ? ref.id : null;
								if (refId === removedId) {
									item.set(property.name, null);
									this.recalculate(item);
								}
							}, this);
							this.render();
						}.bind(this));
					}
				}, this);

				this.items.on("change", function (changed, options) {
					self.recalculate(changed);
					changeTracking.registerChange(changed);
				});
				this.items.on("remove", function (removed, options) {
					changeTracking.registerRemove(removed);
				});
			}.bind(this);

			this.stateListeners = [];

			var dependencies = this.properties
				.filter(function (property) { return property instanceof ReferenceProperty; })
				.map(function (property) { return property.target; });
			var dependenciesReady = Promise.all(_.pluck(dependencies, "ready"));
			dependenciesReady.then(function () {
				self.stateListeners.forEach(function (listener) {
					listener(self, TableState.DEPENDENCIES_READY);
				});
			});
			var itemsLoaded = new Promise(function (resolve, reject) {
				itemFetcher(self, {
					success: function (items) {
						dependenciesReady.then(function () {
							var resetStart = new Date().getTime();
							self.items.reset(items);
							var resetEnd = new Date().getTime();
							console.log("Collection reset for", self.name, "in", resetEnd - resetStart, "ms, which is", (resetEnd - resetStart) / items.length, "ms/item");
							resolve(items);
						}, function () {
							reject.apply(this, arguments);
						});
					},
					error: reject
				});
			});
			itemsLoaded.then(function () {
				self.stateListeners.forEach(function (listener) {
					listener(self, TableState.ITEMS_LOADED);
				});
			});
			var itemsInitialized = itemsLoaded.then(function (items) {
				return new Promise(function (resolve, reject) {
					initializeChangeTracking();
					console.log("Change tracking initialized for", self.name);
					resolve(items);
				});
			});
			itemsInitialized.then(function () {
				self.stateListeners.forEach(function (listener) {
					listener(self, TableState.ITEMS_INITIALIZED);
				});
			});
			
			this.ready = Promise.all([itemsInitialized]);
			this.ready.then(function () {
				console.log("Table ready", self.name);
				self.stateListeners.forEach(function (listener) {
					listener(self, TableState.READY);
				});
			}, function () {
				console.log("Table failed to initialize", self.name, arguments)
				self.stateListeners.forEach(function (listener) {
					listener(self, TableState.FAILED);
				});
			});
        };
		Table.prototype.getProperty = function (name) {
			return this.propertiesMap[name];
		}
		Table.prototype.setFilter = function (filter) {
			if (this.hot) {
				var data = filter ? this.items.filter(filter) : this.items;
				this.hot.loadData(data);
			}
		};
		Table.prototype.render = function () {
			if (this.hot) {
				this.hot.render();
			}
		};
        Table.prototype.recalculate = function (item) {
			// console.log("Recalculating", this.name, item);
			for (var idx = 0, len = this.recalculateProps.length; idx < len; idx++) {
				this.recalculateProps[idx](item);
			}
        };
		Table.prototype.addItem = function (attributes) {
			changeTracking.start();
			try {
				var item = new this.BackboneModel(attributes);
				if (!item.get(this.id.name)) {
					var maxId = 0;
					this.items.forEach(function (item) {
						maxId = Math.max(item.asNumber(this.id.name), maxId);
					}, this);
					item.set(this.id.name, maxId + 1);
				}

				this.items.add(item);
				this.recalculate(item);
				this.render();
			} finally {
				changeTracking.finish();
			}
		};
		Table.prototype.removeSelectedItems = function (attributes) {
			if (!this.hot) {
				return;
			}
			changeTracking.start();
			try {
				var selected = this.hot.getSelectedRange();
				if (!selected) {
					return;
				}
				var startRow = selected.from.row;
				var endRow = selected.to.row;
				for (var rowNumber = startRow; rowNumber <= endRow; rowNumber++) {
					var item = this.hot.getSourceDataAtRow(rowNumber);
					this.items.remove(item);
				}
				this.render();
			} finally {
				changeTracking.finish();
			}
		};
		Table.prototype.load = function (root) {
			var hot = new Handsontable(root, this.settings);
			hot.addHook("modifyRowHeight", function () {
				return 21;
			});
			this.hot = hot;
		};
		Table.prototype.unload = function (hot) {
			if (this.hot) {
				this.hot.destroy();
				this.hot = null;
			}
		};
		Table.prototype.toString = function () {
			return this.name;
		};
        tables.Table = Table;
        
        return tables;
    });

	tablesModule.directive("backboneTable", function() {
		var normalize = function (string) {
			if (!string) {
				return string;
			}
			if (typeof string !== 'string') {
				string = string.toString();
			}
			if (String.prototype.normalize) {
				string = string.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
			}
			string = string.toLowerCase();
			return string;
		};
		
		var root = null;
		
		return {
			link: function (scope, element, attrs) {
				root = element[0].children[1];
			},
			restrict: "E",
			templateUrl: "modules/utils/tables/backbone-table.html",
			controller: function ($scope) {
				$scope.ready = false;
				$scope.filters = {};
				$scope.filterValues = {};
				$scope.$watch("table", function (table, previousTable) {
					if (previousTable) {
						previousTable.unload();
					}
					$scope.ready = false;
					$scope.filters = {};
					$scope.filterValues = {};
					if (table) {
						table.load(root);
						$scope.filters = (table.filters || []).map(function (propertyName) {
							return table.getProperty(propertyName);
						});
						table.ready.then(function () {
							if ($scope.table === table) {
								$scope.$apply(function () {
									$scope.ready = true;
								});
							}
						});
					}
				});
				$scope.$watch("filterValues", function (filterValues) {
					var filterFunctions = [];
					_.forEach(filterValues, function (filterValue, property) {
						filterValue = normalize(filterValue);
						if (!filterValue) {
							return;
						}
						filterFunctions.push(function (item) {
							var itemValue = normalize(item.value(property));
							return itemValue && itemValue.indexOf(filterValue) !== -1;
						});
					});
					var filterFunction;
					if (filterFunctions.length === 0) {
						filterFunction = null;
					} else {
						filterFunction = function (item) {
							for (var idx = 0, len = filterFunctions.length; idx < len; idx++) {
								if (!filterFunctions[idx](item)) {
									return false;
								}
							}
							return true;
						};
					}
					$scope.table.setFilter(filterFunction);
				}, true);
				$scope.dump = function () {
					console.log("Dump", $scope.table.items);
				};
			},
			scope: {
				table: "="
			}
		}
	});
})();
