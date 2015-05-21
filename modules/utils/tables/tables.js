(function () {
	var tablesModule = angular.module("kapa.utils.tables", [
		"ui.bootstrap",
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
					options.error.apply(this, arguments);
				});
				request.success(function (data) {
					console.log("Data fetched for ", table.name, data);
					// set collection data (assuming you have retrieved a json object)
					collection.reset(data);
					options.success.apply(this, arguments);
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
		changeTracking.registerChange = function (changed) {
			if (pendingChanges !== null) {
				console.log("--- Storing changed", changed);
				var changedId = changed.getTableName() + ":" + changed.id;
				pendingChanges[changedId] = changed;
			} else {
				console.log("--! Ignoring change", changed);
				// throw new Error("Not tracking changes when changed: " + JSON.stringify(changed.toJSON()));
			}
		};
		changeTracking.finish = function () {
			if (pendingChanges === null) {
				return;
			}
			console.log("<<< Finished change tracking", pendingChanges);
			try {
				console.log("=== Changes to save", pendingChanges);
				_.values(pendingChanges).forEach(function (item) {
					changeTracking.operationStartListeners.forEach(function (listener) {
						listener(item);
					});
					item.save().then(function () {
						console.log("Successfully saved", item);
						changeTracking.operationSuccessListeners.forEach(function (listener) {
							listener(item);
						});
					}, function (reason) {
						console.log("Failed to save", item, reason);
						changeTracking.operationFailureListeners.forEach(function (listener) {
							listener(item);
						});
					});					
				});
			} finally {
				pendingChanges = null;
			}
		};

		return changeTracking;
	});

	tablesModule.factory("ReferenceEditor", function () {
		var ReferenceEditor = Handsontable.editors.SelectEditor.prototype.extend();
		ReferenceEditor.prototype.prepare = function() {
			Handsontable.editors.BaseEditor.prototype.prepare.apply(this, arguments);

			var items = this.cellProperties.items;
			if (typeof items == 'function') {
				items = items(this.row, this.col, this.prop);
			}

			Handsontable.Dom.empty(this.select);
			items.forEach(function (item) {
				var optionElement = document.createElement('OPTION');
				optionElement.value = item.id;
				Handsontable.Dom.fastInnerHTML(optionElement, item.toString());
				this.select.appendChild(optionElement);
			}, this);
		};
		return ReferenceEditor;
	});

    tablesModule.factory("tables", function (backboneFetch, backboneSync, changeTracking, ReferenceEditor) {
        var tables = {};
		
		var Property = function (options) {
            _.extend(this, {
					hidden: false,
					readOnly: !!options.recalculate
				},
				options, {
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

        var SimpleProperty = function (options) {
            Property.call(this, _.extend({ type: "text" }, options));
        };
		SimpleProperty.prototype = Object.create(Property.prototype);
		SimpleProperty.prototype.toColumn = function () {
			return _.extend({}, this.column, {
				type: this.type,
				title: this.title,
				data: this.toProperty(),
				readOnly: this.readOnly ? true : false
			});
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
			return _.extend(SimpleProperty.prototype.toColumn.call(this), {
				renderer: function (instance, td, row, col, prop, id, cellProperties) {
					var value = id ? this.source.items.get(id) : null;
					var displayValue = value ? value.toIdString() : id;
					Handsontable.renderers.TextRenderer.call(null, instance, td, row, col, prop, displayValue, cellProperties);
				}.bind(this)
			})
		};

        var ReferenceProperty = function (options) {
			var self = this;
            Property.apply(this, arguments);
			_.extend(this, {
				renderer: function (instance, td, row, col, prop, id, cellProperties) {
					var value = id ? this.target.items.get(id) : null;
					var displayValue = value ? value.toString() : null;
					Handsontable.renderers.TextRenderer.call(null, instance, td, row, col, prop, displayValue, cellProperties);
				},
				toColumn: function () {
					return _.extend({}, this.column, {
		                type: "numeric",
						editor: ReferenceEditor,
						items: function () {
							return self.target.items;
						},
		                title: this.title,
		                data: this.toProperty(),
						renderer: this.renderer.bind(this)
		            });
				},
				toProperty: function () {
					var name = this.name;
					return function (item, value) {
		                if (typeof value === 'undefined') {
							var result = item.value(name);
		                    return result ? result.id : result;
		                } else {
							var ref = value ? self.target.items.get(value) : null;
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
        ItemProperty.prototype.asText = function () {
            return this.item.asText(this.property);
        };
        tables.ItemProperty = ItemProperty;
		
        var Table = function (options) {
			_.extend(this, {
                properties: []
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
					})
			}, options.items));
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
                    self.items.forEach(function (item) {
                        maxId = Math.max(item.asNumber(self.id.name), maxId);
                    }, self);
                    return maxId + 1;
                } else if (hasId && !hasSomeValues) {
                    return null;
                } else {
                    return item.value(self.id.name);
                }
            };
            this.id = new IdProperty({
				name: "id",
				title: "ID",
				hidden: options.hideId,
				column: {
					className: "htCenter",
					width: 60
				},
				recalculate: assignId
			});
            this.properties.unshift(this.id);

            this.propertiesMap = {};
            this.properties.forEach(function (property) {
                this.propertiesMap[property.name] = property;
				property.source = this;
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
				}
			}, this);

			this.items.on("change", function (changed, options) {
				self.recalculate(changed);
				changeTracking.registerChange(changed);
			});

			var hotResolved;
			var hotInitialized = new Promise(function (resolve, reject) {
				hotResolved = resolve;
			});
			var afterInit = function () {
				self.hot = this;
				hotResolved(this);
			};
			
            this.settings = $.extend({}, this.settings, {
                data: this.items,
				// TODO Without this a RangeError is thrown with columnSorting enabled
				observeChanges: false,
				columnSorting: true,
                dataSchema: function () { return new self.BackboneModel(); },
				afterInit: afterInit,
				beforeChange: changeTracking.start,
				afterChange: changeTracking.finish,
                columns: this.properties
					.filter(function (property) { return !property.hidden })
					.map(function (property) { return property.toColumn(); })
            });
			
			var dependencies = this.properties
				.filter(function (property) { return property instanceof ReferenceProperty; })
				.map(function (property) { return property.target; });
			console.log(this.name, "depends on", dependencies);
			var dependenciesFetched = Promise.all(_.pluck(dependencies, "ready"));
			dependenciesFetched.then(function () {
				console.log("Dependencies fetched for", self.name);
			});
			var itemsFetched = dependenciesFetched.then(function () {
				return new Promise(function (resolve, reject) {
					self.items.fetch({
						success: resolve,
						error: reject
					});
				});
			});
			itemsFetched.then(function () {
				console.log("Items fetched for", self.name);
			});

			this.ready = Promise.all([hotInitialized, itemsFetched]);
			this.ready.then(function () {
				console.log("Table initialized", self.name);
			}, function () {
				console.log("Table failed to initialize", self.name, arguments)
			});
        };
		Table.prototype.setFilter = function (filter) {
			if (this.hot) {
				var data = filter ? this.items.filter(filter) : this.items;
				this.hot.loadData(data);
			}
		};
		Table.prototype.render = function () {
			console.log("Render requested", this.name, this.items);
			if (this.hot) {
				console.log("Re-rendering");
				this.hot.render();
			}
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
		Table.prototype.addItem = function (attributes) {
			changeTracking.start();
			try {
				var item = new this.BackboneModel(attributes);
				this.items.add(item);
				this.recalculate(item);
				this.render();
			} finally {
				changeTracking.finish();
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

		return {
			link: function (scope, element, attrs) {
				new Handsontable(element[0].children[1], scope.table.getSettings());
			},
			restrict: "E",
			templateUrl: "modules/utils/tables/backbone-table.html",
			controller: function ($scope) {
				$scope.ready = false;
				$scope.table.ready.then(function () {
					$scope.$apply(function () {
						$scope.ready = true;
					});
				});
				$scope.filter = "";
				if ($scope.filterProperty) {
					$scope.$watch("filter", function (filter) {
						if (!filter) {
							$scope.table.setFilter(null);
						} else {
							filter = normalize(filter);
							$scope.table.setFilter(function (item) {
								var name = normalize(item.get($scope.filterProperty));
								if (!name) {
									return false;
								}
								return name.indexOf(filter) !== -1;
							});
						}
					});
				}
				$scope.addItem = function () {
					$scope.table.addItem();
				};
				$scope.dump = function () {
					console.log("Dump", $scope.table.items);
				};
			},
			scope: {
				table: "=",
				filterProperty: "@filter"
			}
		}
	});
})();
