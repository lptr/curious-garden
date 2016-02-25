(function () {
	var services = angular.module("kapa.services", []);

	services.factory("normalizer", function() {
		var normalize = (function() {
			var translate_re = /[éáűőúöüóíÉÁŰPŐÚÖÜÓÍ]/g;
			var translate = { "é": "e", "á": "a", "ű": "u", "ő": "o", "ú": "u", "ö": "o", "ü": "u", "ó": "o", "í": "i", "É": "E", "Á": "A", "Ű": "U", "Ő": "O", "Ú": "U", "Ö": "O", "Ü": "U", "Ó": "O", "Í": "I" };
			return function(input) {
				if (!input) {
					return input;
				}
				return (input.replace(translate_re, function(match) {
					return translate[match];
				})).toLowerCase();
			};
		})();

		return {
			find: function (elements, input, property) {
				var inputRegex = new RegExp("\\b" + normalize(input));
				return elements.filter(function (element) {
					if (property) {
						element = element[property];
					}
					var normalizedElement = normalize(element);
					return inputRegex.test(normalizedElement);
				});
			}
		};
	});

	services.factory("kapaServer", function ($http, $location, $q) {
		var getQueryString = function () {
			var result = {}
			var queryString = location.search.slice(1);
			var re = /([^&=]+)=([^&]*)/g;
			var m;

			while (m = re.exec(queryString)) {
				result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
			}

			return result;
		};

		var development = getQueryString()["dev"];
		var serverUrl;
		if (development) {
			serverUrl = "https://script.google.com/macros/s/AKfycbzPbRBwsQobbXzgbT52P0m4-09SS2KMNZOmR_8Vfz4/dev";
		} else {
			serverUrl = "https://script.google.com/macros/s/AKfycbw3K4PgqRNE6sstX6Z6Exy39cnpmLiIKWReTNUcN-4CRTcRbS8/exec"
		}
		var that = {
			getUrl: function () {
				return serverUrl;
			},
			query: function (method, data, ignoreErrors) {
				return $q(function (resolve, reject) {
					console.log("Sending request to " + method, data);
					var request = $http.jsonp(serverUrl, {
						params: {
							method: method,
							data: JSON.stringify(data),
							callback: "JSON_CALLBACK"
						}
					})

					if (!ignoreErrors) {
						request.error(function(data, status, headers, config) {
							console.log("Error", arguments);
							alert("Error: " + status);
						});
					}

					request.success(function (result) {
						console.log(method, "with data", data, "received", result);
						resolve(result);
					});
					request.error(reject);
				});
			}
		};
		return that;
	});

	services.factory("dataManager", function (kapaServer) {
		var Loader = function(kapaServer, method) {
			var cache = {};
			return {
				fetch: function (data, ignoreErrors) {
					var key = JSON.stringify(data);
					var promise = cache[key];
					if (!promise) {
						promise = kapaServer.query(method, data, ignoreErrors);
						cache[key] = promise;
					}
					return promise;
				}
			};
		};

		return function (method) {
			return new Loader(kapaServer, method);
		};
	});

	services.factory("userManager", function (dataManager) {
		return dataManager("getUser");
	});

	services.factory("accountManager", function (dataManager) {
		return dataManager("getAccounts");
	});

	services.factory("payeeManager", function (dataManager) {
		return dataManager("getPayees");
	});

	services.factory("employeeManager", function (dataManager) {
		return dataManager("getEmployees");
	});

	services.factory("categoryManager", function (dataManager) {
		return dataManager("getCategories");
	});

	services.factory("harvestManager", function (dataManager) {
		return dataManager("getHarvests");
	});

	services.factory("harvestEstimateManager", function (dataManager) {
		return dataManager("getHarvestEstimates");
	});

	services.factory("potentialHarvestManager", function (dataManager) {
		return dataManager("getPotentialHarvests");
	});

	services.factory("produceManager", function (dataManager) {
		return dataManager("getProduces");
	});

	services.factory("productManager", function (dataManager) {
		return dataManager("getProducts");
	});

	services.factory("priceTagManager", function (dataManager) {
		return dataManager("getPriceTags");
	});

	services.factory("seedManager", function (dataManager) {
		return dataManager("getSeeds");
	});

	services.filter('reverse', function() {
		return function(items) {
			return items.slice().reverse();
		};
	});
})();
