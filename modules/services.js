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

	services.factory("kapaServer", function ($http, $location) {
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
		return {
			getUrl: function () {
				return serverUrl;
			},
			query: function (method, data, ignoreErrors) {
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
						console.log("Error", data, status, headers, config);
						alert("Error: " + status);
					});
				}

				return request;
			}
		};
	});

	var Loader = function(kapaServer, method) {
		var cache = {};
		return {
			load: function (callback, data) {
				if (cache[data]) {
					callback(cache[data]);
				} else {
					kapaServer.query(method, data).success(function (result) {
						console.log(method, "with data", data, "received", result);
						cache[data] = result;
						callback(result);
					});
				}
			}
		};
	};

	services.factory("userManager", function (kapaServer) {
		return new Loader(kapaServer, "getUser");
	});

	services.factory("accountManager", function (kapaServer) {
		return new Loader(kapaServer, "getAccounts");
	});

	services.factory("payeeManager", function (kapaServer) {
		return new Loader(kapaServer, "getPayees");
	});

	services.factory("employeeManager", function (kapaServer) {
		return new Loader(kapaServer, "getEmployees");
	});

	services.factory("categoryManager", function (kapaServer) {
		return new Loader(kapaServer, "getCategories");
	});

	services.factory("produceManager", function (kapaServer) {
		return new Loader(kapaServer, "getProduces");
	});

	services.factory("productManager", function (kapaServer) {
		return new Loader(kapaServer, "getProducts");
	});

	services.factory("productNameManager", function (kapaServer) {
		return new Loader(kapaServer, "getProductNames");
	});

	services.factory("priceTagManager", function (kapaServer) {
		return new Loader(kapaServer, "getPriceTags");
	});

	services.filter('reverse', function() {
		return function(items) {
			return items.slice().reverse();
		};
	});
})();
