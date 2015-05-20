(function () {
	var tablesModule = angular.module("kapa.utils.tables", [
	]);

	var serverUrl = "https://script.google.com/macros/s/AKfycbw5ogvZt6Gt-h8cjd2y0a8HHD8FLfItErvspkaop6o/dev";
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
	
	tablesModule.factory("backboneFetch", function ($http) {
		return function (table) {
			return function (options) {
				console.log("Fetching", table.name);
				var collection = this;
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
				})
				.success(function (data) {
					console.log("Data fetched for ", table.name, data);
					// set collection data (assuming you have retrieved a json object)
					collection.reset(data);
					// table.render();
				});
				return request;
			};			
		};
	});

    tablesModule.factory("suffixRenderer", function () {
        return function (suffix) {
            return function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(null, arguments);
                if (td.textContent) {
                    td.textContent += suffix;
                }
            };
        };
    });

    tablesModule.factory("tables", function (backboneFetch) {
        var tables = {};
		
		var Property = function (options) {
            _.extend(this, { readOnly: !!options.recalculate }, options, {
				toProperty: function () {
					var name = this.name;
					return function (item, value) {
		                if (typeof value === 'undefined') {
		                    return item.get(name);
		                } else {
		                    return item.set(name, value);
		                }
		            };
				}
			});
        };
        tables.Property = Property;

		var propName = function (property) {
			if (typeof property === "string") {
				return property;
			} else if (property instanceof Property) {
				return property.name;
			} else {
				throw new Error("Unknown property: " + property);
			}
		}
		
        var SimpleProperty = function (options) {
            Property.call(this, _.extend({}, { type: "text" }, options));
			_.extend(this, {
				toColumn: function () {
					return _.extend({}, this.column, {
		                type: this.type,
		                title: this.title,
		                data: this.toProperty(),
		                readOnly: this.readOnly ? true : false
		            });
				}
			});
        };
        SimpleProperty.prototype = Object.create(Property.prototype);
        tables.SimpleProperty = SimpleProperty;

        var ReferenceProperty = function (options) {
            Property.apply(this, arguments);
			_.extend(this, {
				renderer: function (instance, td, row, col, prop, value, cellProperties) {
					// var displayValue = value ? value.get("name") : null;
					var displayValue = value;
					Handsontable.renderers.TextRenderer.apply(null, [instance, td, row, col, prop, displayValue, cellProperties]);
					// var value = this.value(row);
					// if (value) {
					//	 if (!value.id) {
					//		 td.color = "red";
					//	 } else {
					//		 td.title = "ID: " + value.id;
					//	 }
					// }
					return td;
				},
				toColumn: function () {
					return _.extend({}, this.column, {
		                type: "dropdown",
		                source: function (query, process) { process(this.target.backboneCollection); }.bind(this),
		                title: this.title,
		                data: this.toProperty(),
		                renderer: this.renderer.bind(this)
		            });
				}
			});
        };
        ReferenceProperty.prototype = Object.create(Property.prototype);
        tables.ReferenceProperty = ReferenceProperty;

		var Item = Backbone.RelationalModel.extend({
			defaultValues: {},
			defaultValue: function (property) {
				return defaultValues[property];
			},
			setDefaultValue: function (property, value, options) {
				defaultValues[property] = value;
			},
			value: function (property) {
				var value = this.get(property);
				if (value === null) {
					value = this.getDefaultValue(property);
				}
	            return value;
	        },
			hasExplicit: function (property) {
				return defaultValues[property] !== null;
			},
			number: function (property) {
				var value = this.value(property);
	            return typeof value === 'number' ? value : 0;
			},
			text: function (property) {
				var value = this.value(property);
	            return typeof value === 'string' ? value : "";
			},
			toString: function () {
				return this.get("name");
			}
		});

        var ItemProperty = function (item, property) {
            this.item = item;
            this.property = property;
        };
        ItemProperty.prototype.value = function () {
            return this.item.value(this.property);
        };
		ItemProperty.prototype.has = function () {
            return this.item.has(this.property);
        };
		ItemProperty.prototype.hasExplicit = function () {
            return this.item.hasExplicit(this.property);
        };
        ItemProperty.prototype.asNumber = function () {
            return this.item.asNumber(this.property);
        };
        ItemProperty.prototype.asText = function () {
            return this.item.asText(this.property);
        };
        tables.ItemProperty = ItemProperty;
		
        var Table = function (options) {
			_.extend(this, {
                properties: []
            }, options);
			var self = this;
			this.BackboneModel = Item.extend({
				getTableName: function () {
					return this.name;
				},
				relations: options.properties.filter(function (property) {
						return property instanceof ReferenceProperty;
					}).map(function (property) {
						return {
							type: Backbone.HasOne,
							key: property.name,
							relatedModel: property.target.BackboneModel
						}
					})
			});
			var BackboneCollection = Backbone.Collection.extend({
				model: this.BackboneModel,
				fetch: backboneFetch(this),
				splice: function (index, howMany) {
					var args = _.toArray(arguments).slice(2).concat({at: index}),
					removed = this.models.slice(index, index + howMany);
					this.remove(removed).add.apply(this, args);
					return removed;
				}
			});
			this.items = new BackboneCollection();
			
			this.items.on('all', function () {
				if (self.hot) {
					self.hot.render();
				}
			});

			// this.data = this.items;
			// this.dataSchema = function () { return new this.BackboneModel() };

            var dataProperties = this.properties.slice();
            var assignId = function (item) {
                var hasId = item.hasValue(self.id.name);
                var hasSomeValues = dataProperties.some(function (property) { return item.hasValue(property.name); });
                if (!hasId && hasSomeValues) {
                    var maxId = 0;
                    self.data.forEach(function (item) {
                        maxId = Math.max(item.asNumber(self.id.name), maxId);
                    }, self);
                    return maxId + 1;
                } else if (hasId && !hasSomeValues) {
                    return null;
                } else {
                    return item.value(self.id.name);
                }
            };
            this.id = new SimpleProperty({ name: "id", title: "ID", readOnly: true, column: { className: "htCenter" }, recalculate: assignId });
            this.properties.unshift(this.id);

            this.propertiesMap = {};
            this.properties.forEach(function (property) {
                this.propertiesMap[property.name] = property;
            }, this);
            this.recalculateProps = this.properties.map(function (property) {
				var executeRecalculation = function (item, calc, set) {
					if (typeof calc !== 'function') {
	                    return;
	                }
					var parameters = this.injectParameters(calc, item);
                    set.apply(property, [item, calc.apply(property, parameters)]);
				}.bind(this);
				return function (item) {
					executeRecalculation(item, property.recalculate, property.setValue);
					executeRecalculation(item, property.recalculateDefault, property.setDefaultValue);
				};
            }, this);

            this.Item = function (json) {
                Item.apply(this);
                self.properties.forEach(function (property) {
                    property.fromJson(this, json);
                }, this);
                self.recalculate(this);
            };
            this.Item.prototype = Object.create(Item.prototype);

			this.changeListeners = [];
			this.removeListeners = [];
			var afterInit = function () {
				self.hot = this;
				self.items.on("all", function () {
					console.log("Changed", arguments);
					self.hot.render();
				});
			};
            var afterChange = function (changes, source) {
				// Do not process events for other tables
				if (this !== self.hot) {
					return;
				}
                console.log("Edit in " + self.name + ":", source, changes);
				self.invalidate();
                // Don't do stuff when loading
                if (source === "loadData" || !changes) {
                    return;
                }
                var changed = {};
                changes.forEach(function (change) {
                    var rowNo = change[0];
					var row = self.data[rowNo];
					var changedId = row["id"];
                    if (!changed[changedId]) {
                        changed[changedId] = row;
                        self.recalculate(row);
                    }
                });
                this.render();
				self.changeListeners.forEach(function (changeListener) {
					changeListener(self, changed);
				});
            };

			// this.properties.forEach(function (property) {
			// 	if (property instanceof ReferenceProperty) {
			// 		property.target.addChangeListener(function (source, changed) {
			// 			this.data.forEach(function (item) {
			// 				var ref = property.value(item);
			// 				var refId = ref ? ref.id : null;
			// 				if (refId in changed) {
			// 					this.recalculate(item);
			// 				}
			// 			}, this);
			// 			if (this.hot) {
			// 				this.hot.render();
			// 			}
			// 		}.bind(this));
			// 		property.target.addRemoveListener(function (source, removed) {
			// 			this.data.forEach(function (item) {
			// 				var ref = property.value(item);
			// 				var refId = ref ? ref.id : null;
			// 				if (refId in removed) {
			// 					property.setValue(item, null);
			// 					this.recalculate(item);
			// 				}
			// 			}, this);
			// 			if (this.hot) {
			// 				this.hot.render();
			// 			}
			// 		}.bind(this));
			// 	}
			// }, this);

            this.settings = $.extend({}, this.settings, {
                data: this.items,
				// TODO This causes RangeError when observing Backbone objects
				// columnSorting: true,
                dataSchema: function () { return new self.BackboneModel(); },
				afterInit: afterInit,
                // afterChange: afterChange,
                columns: this.properties.map(function (property) { return property.toColumn(); })
            });
        };
		Table.prototype.render = function () {
			console.log("Render requested", this.items);
			if (this.hot) {
				console.log("Re-rendering");
				this.hot.render();
			}
		};
		Table.prototype.fetch = function () {
			this.items.fetch();
		};
		Table.prototype.injectParameters = function (fun, item) {
			var parameterNames = angular.injector.$$annotate(fun);
			var parameters = parameterNames.map(function (name) {
				if (name === "item") {
					return item;
				}
				var dependentProperty = this.propertiesMap[name];
				if (!dependentProperty) {
					throw new Error("Unknown property '" + name + "' for table '" + this.name + "'");
				}
				return new ItemProperty(item, dependentProperty);
			}, this);
			return parameters;
		};
		Table.prototype.addChangeListener = function (listener) {
			this.changeListeners.push(listener);
		};
		Table.prototype.addRemoveListener = function (listener) {
			this.removeListeners.push(listener);
		};
        Table.prototype.recalculate = function (item) {
			console.log("Recalculating", this.name, item);
            this.recalculateProps.forEach(function (recalculateProp) {
                recalculateProp(item);
            });
        };
		Table.prototype.invalidate = function () {
			this.idLookup = null;
			this.nameLookup = null;
			this.allNames = null;
			// console.log("Invalidated", this.name);
		};
		Table.prototype.createLookups = function () {
			if (this.idLookup && this.nameLookup && this.allNames) {
				return;
			}
			this.idLookup = {};
			this.nameLookup = {};
			this.allNames = [];
			this.data.forEach (function (datum) {
                var id = datum["id"];
                var name = datum["name"];
				if (id) {
	                this.idLookup[id] = datum;
	                this.nameLookup[name] = datum;
					this.allNames.push(name);
				}
            }, this);
			console.log("Created lookups for", this.name);
		};
		Table.prototype.getIdLookup = function () {
			this.createLookups();
			return this.idLookup;
		};
		Table.prototype.getNameLookup = function () {
			this.createLookups();
			return this.nameLookup;
		};
		Table.prototype.getAllNames = function () {
			this.createLookups();
			console.log("Get all names", this.allNames);
			return this.allNames;
		};
        Table.prototype.getSettings = function () {
			return this.settings;
        };
		Table.prototype.updateSettings = function (settings) {
			if (this.hot) {
				this.hot.updateSettings(settings);
				this.settings = hot.getSettings();
			}
		};
		Table.prototype.link = function (element) {
			element.handsontable(this.getSettings());
		};
        tables.Table = Table;
        
        return tables;
    });
})();
