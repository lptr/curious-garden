(function () {
	var tablesModule = angular.module("kapa.utils.tables", [
	]);

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

    tablesModule.factory("tables", function (backboneFetch, backboneSync) {
        var tables = {};
		
		var Property = function (options) {
            _.extend(this, { readOnly: !!options.recalculate }, options, {
				toProperty: function () {
					var name = this.name;
					return function (item, value) {
		                if (typeof value === 'undefined') {
		                    return item.value(name);
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
			var self = this;
            Property.apply(this, arguments);
			_.extend(this, {
				toColumn: function () {
					return _.extend({}, this.column, {
		                type: "dropdown",
						source: function (query, process) {
							process(self.target.items.models);
						},
		                title: this.title,
		                data: this.toProperty()
		            });
				},
				toProperty: function () {
					var name = this.name;
					return function (item, value) {
		                if (typeof value === 'undefined') {
		                    return item.value(name);
		                } else {
							var ref = value.item;
		                    return item.set(name, ref);
		                }
		            };
				}
			});
        };
        ReferenceProperty.prototype = Object.create(Property.prototype);
        tables.ReferenceProperty = ReferenceProperty;

		var delegate = function (type, fun) {
			return function () { return type.prototype[fun].apply(this, arguments); };
		};

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
			hasExplicit: function (property) {
				return this.defaultValues[property] !== null;
			},
			asNumber: function (property) {
				var value = this.value(property);
	            return typeof value === 'number' ? value : 0;
			},
			asText: function (property) {
				var value = this.value(property);
	            return typeof value === 'string' ? value : "";
			},
			toString: function () {
				return this.get("name");
			},
			toLowerCase: delegate(String, "toLowerCase"),
			toUpperCase: delegate(String, "toLowerCase"),
			substr: delegate(String, "toLowerCase"),
			replace: delegate(String, "replace")
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
					return self.name;
				},
				sync: backboneSync,
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
			
			this.items.on("all", function () {
				console.log("Backbone event", self.name, arguments);
			});
			this.items.on("reset", function () {
				self.items.forEach(function (item) {
					self.recalculate(item);
				});
				self.render.bind(self)();
			});

            var dataProperties = this.properties.slice();
            var assignId = function (item) {
                var hasId = item.has(self.id.name);
                var hasSomeValues = dataProperties.some(function (property) { return item.has(property.name); });
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
                    set.apply(property, [property.name, calc.apply(property, parameters)]);
				}.bind(this);
				return function (item) {
					executeRecalculation(item, property.recalculate, item.set.bind(item));
					executeRecalculation(item, property.recalculateDefault, item.setDefaultValue.bind(item));
				};
            }, this);

			var afterInit = function () {
				self.hot = this;
			};
			
			var pendingChanges = null;
			var beforeChange = function (changes, source) {
				console.log(">>> Before change", self.name, arguments);
				pendingChanges = {};
			};
			this.items.on("change", function (changed, options) {
				console.log("--- Storing changed", self.name, changed, pendingChanges);
				if (pendingChanges !== null) {
					var changedId = changed.getTableName() + ":" + changed.id;
					pendingChanges[changedId] = changed;
				}
			});
            var afterChange = function (changes, source) {
				console.log("<<< After change", self.name, arguments);
				if (pendingChanges === null) {
					return;
				}
				try {
					console.log("=== Changes to save", self.name, pendingChanges);
					_.values(pendingChanges).forEach(function (item) {
						item.save();
					});
				} finally {
					pendingChanges = null;
				}
            };

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
					// property.target.addRemoveListener(function (source, removed) {
					// 	this.data.forEach(function (item) {
					// 		var ref = property.value(item);
					// 		var refId = ref ? ref.id : null;
					// 		if (refId in removed) {
					// 			property.setValue(item, null);
					// 			this.recalculate(item);
					// 		}
					// 	}, this);
					// 	if (this.hot) {
					// 		this.hot.render();
					// 	}
					// }.bind(this));
				}
			}, this);
			this.items.on("change", function (changed, options) {
				this.recalculate(changed);
			}.bind(this));

            this.settings = $.extend({}, this.settings, {
                data: this.items,
				// TODO This causes RangeError when observing Backbone objects
				// columnSorting: true,
                dataSchema: function () { return new self.BackboneModel(); },
				afterInit: afterInit,
				beforeChange: beforeChange,
				afterChange: afterChange,
                // afterChange: afterChange,
                columns: this.properties.map(function (property) { return property.toColumn(); })
            });
        };
		Table.prototype.render = function () {
			console.log("Render requested", this.name, this.items);
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
				return new ItemProperty(item, dependentProperty.name);
			}, this);
			return parameters;
		};
        Table.prototype.recalculate = function (item) {
			console.log("Recalculating", this.name, item);
            this.recalculateProps.forEach(function (recalculateProp) {
                recalculateProp(item);
            });
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
