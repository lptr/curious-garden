(function () {
	var tablesModule = angular.module("kapa.utils.tables", [
	]);

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

    tablesModule.factory("tables", function () {
        var tables = {};

        var Property = function (options) {
            $.extend(this, { readOnly: !!options.recalculate }, options);
        };
		Property.prototype.defaultValue = function (item) {
			return item[this.name + ".default"];
		};
		Property.prototype.setDefaultValue = function (item, value) {
			item[this.name + ".default"] = value;
		};
        Property.prototype.value = function (item) {
            return item[this.name] || this.defaultValue(item);
        };
		Property.prototype.setValue = function (item, value) {
			item[this.name] = value;
		};
		Property.prototype.hasValue = function (item) {
            return !!this.value(item);
        };
		Property.prototype.hasExplicitValue = function (item) {
            return !!item[this.name];
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
        tables.Property = Property;

        var SimpleProperty = function (options) {
            Property.apply(this, arguments);
        };
        SimpleProperty.prototype = Object.create(Property.prototype);
        SimpleProperty.prototype.get = function (item) {
            return this.value(item);
        };
        SimpleProperty.prototype.set = function (item, value) {
            this.setValue(item, value);
        };
        SimpleProperty.prototype.toJson = function (item, json) {
            json[this.name] = item[this.name];
        };
        SimpleProperty.prototype.fromJson = function (item, json) {
            this.setValue(item, json ? json[this.name] : null);
        };
        SimpleProperty.prototype.toColumn = function () {
            return $.extend({}, this.column, {
                type: this.type || "text",
                title: this.title,
                data: this.toProperty(),
                readOnly: this.readOnly ? true : false
            });
        };
        tables.SimpleProperty = SimpleProperty;

        var ReferenceProperty = function (options) {
            Property.apply(this, arguments);
            $.extend(this, {});
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
            var value = this.value(item);
            // console.log("Item: ", item, " value: ", value);
            return value ? value["name"] : null;
        };
        ReferenceProperty.prototype.set = function (item, value) {
            var ref;
            if (value === null || value === "") {
                ref = null;
            } else if (typeof value === 'string') {
                ref = this.target.getNameLookup()[value];
                if (!ref) {
                    ref = {};
                    ref["id"] = null;
                    ref["name"] = value;
                }
            } else {
                ref = value;
            }
            // console.log(">>> SET", item, ref);
            this.setValue(item, ref);
        };
        ReferenceProperty.prototype.toJson = function (item, json) {
			var value = item[this.name];
            json[this.name] = value ? value.id : null;
        };
        ReferenceProperty.prototype.fromJson = function (item, json) {
            var value = json ? json[this.name] : null;
            this.setValue(item, value ? this.target.getIdLookup()[value] : null);
        };
        ReferenceProperty.prototype.toColumn = function () {
            return $.extend({}, this.column, {
                type: "dropdown",
                source: function (query, process) { process(this.target.getAllNames()); }.bind(this),
                title: this.title,
                data: this.toProperty(),
                renderer: ReferenceProperty.renderer.bind(this)
            });
        };
        tables.ReferenceProperty = ReferenceProperty;

        var Item = function () {
        };
        Item.prototype.value = function (property) {
            return property.value(this);
        };
		Item.prototype.hasValue = function (property) {
            return property.hasValue(this);
        };
		Item.prototype.hasExplicitValue = function (property) {
            return property.hasExplicitValue(this);
        };
        Item.prototype.asNumber = function (property) {
            return property.asNumber(this);
        };
        Item.prototype.asText = function (property) {
            return property.asText(this);
        };
        tables.Item = Item;

        var ItemProperty = function (item, property) {
            this.item = item;
            this.property = property;
        };
        ItemProperty.prototype.value = function () {
            return this.property.value(this.item);
        };
		ItemProperty.prototype.hasValue = function () {
            return this.property.hasValue(this.item);
        };
		ItemProperty.prototype.hasExplicitValue = function () {
            return this.property.hasExplicitValue(this.item);
        };
        ItemProperty.prototype.asNumber = function () {
            return this.property.asNumber(this.item);
        };
        ItemProperty.prototype.asText = function () {
            return this.property.asText(this.item);
        };
        tables.ItemProperty = ItemProperty;
		
        var Table = function (options) {
            $.extend(this, {
                data: [],
                properties: []
            }, options);
            var dataProperties = this.properties.slice();
            var self = this;
            var assignId = function (item) {
                var hasId = item.hasValue(self.id);
                var hasSomeValues = dataProperties.some(function (property) { return item.hasValue(property); });
                if (!hasId && hasSomeValues) {
                    var maxId = 0;
                    self.data.forEach(function (item) {
                        maxId = Math.max(item.asNumber(self.id), maxId);
                    }, self);
                    return maxId + 1;
                } else if (hasId && !hasSomeValues) {
                    return null;
                } else {
                    return item.value(self.id);
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
            var afterChange = function (changes, source) {
				// Do not process events for other tables
				if (this !== self.hot) {
					return;
				}
                console.log("Event in " + self.name + ":", source, changes);
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
			
			this.properties.forEach(function (property) {
				if (property instanceof ReferenceProperty) {
					property.target.addChangeListener(function (source, changed) {
						this.data.forEach(function (item) {
							var ref = property.value(item);
							var refId = ref ? ref.id : null;
							if (changed[refId]) {
								this.recalculate(item);
							}
						}, this);
						if (this.hot) {
							this.hot.render();
						}
					}.bind(this));
				}
			}, this);

            this.settings = $.extend({}, this.settings, {
                data: this.data,
                dataSchema: function () { return new this.Item({}); }.bind(this),
				afterInit: function () { self.hot = this; },
                afterChange: [afterChange],
                columns: this.properties.map(function (property) { return property.toColumn(); })
            });
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
        Table.prototype.recalculate = function (item) {
            this.recalculateProps.forEach(function (recalculateProp) {
                recalculateProp(item);
            });
        };
		Table.prototype.invalidate = function () {
			this.idLookup = null;
			this.nameLookup = null;
			this.allNames = null;
			console.log("Invalidated", this.name);
		};
		Table.prototype.createLookups = function () {
			if (this.idLookup && this.nameLookup && this.names) {
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
			this.settings = settings;
			if (this.hot) {
				this.hot.updateSettings(settings);
			}
		};
        Table.prototype.load = function (itemsJson) {
            // Clear the array
            this.data.length = 0;
            itemsJson.forEach(function (itemJson) {
                this.data.push(new this.Item(itemJson));
            }, this);
        };
		Table.prototype.link = function (element) {
			element.handsontable(this.getSettings());
		};
        tables.Table = Table;
        
        return tables;
    });
})();
