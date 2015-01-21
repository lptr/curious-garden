(function () {
	var services = angular.module("kapa.services", []);

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
			serverUrl = "https://script.google.com/macros/s/AKfycbzr__tdtQoB4Hg9mJOCaK8Y9AL8Fwx4uyIxHefJSis/dev";
		} else {
			serverUrl = "https://script.google.com/macros/s/AKfycbwBGeZPzlmi-4wu23s3NyQP0T1rE71750FNYOFPAozPignicus/exec"
		}
		return {
			getUrl: function () {
				return serverUrl;
			},
			query: function (method, data) {
				return $http.jsonp(serverUrl, {
					params: {
						method: method,
						data: JSON.stringify(data),
						callback: "JSON_CALLBACK"
					}
				}).error(function(data, status, headers, config) {
					console.log("Error", data, status, headers, config);
					alert("Error: " + status);
				});
			}
		};
	});

	services.factory("accountManager", function (kapaServer) {
		return {
			load: function (callback) {
				kapaServer.query("getAccounts").success(function (accounts) {
					console.log("Got accounts", accounts);
					callback(accounts);
				});
			}
		};
	});

	services.factory("payeeManager", function (kapaServer) {
		return {
			load: function (callback) {
				kapaServer.query("getPayees").success(function (payees) {
					console.log("Got payees", payees);
					callback(payees);
				});
			}
		};
	});

	services.factory("employeeManager", function (kapaServer) {
		return {
			load: function (callback) {
				kapaServer.query("getEmployees").success(function (employees) {
					console.log("Got employees", employees);
					callback(employees);
				});
			}
		};
	});

	services.factory("categoryManager", function (kapaServer) {
		return {
			load: function (callback) {
				kapaServer.query("getCategories").success(function (categories) {
					console.log("Got work categories", categories);
					callback(categories);
				});
			},
			convertCategory: function (categories, hungarian) {
				// Try to find category in the given categories
				// and translate from there
				for (var i = 0; i < categories.length; i++) {
					var category = categories[i];
					if (category.hungarian == hungarian) {
						return category.english;
					}
				}
				// Fall back to the original if not found
				return hungarian;
			}
		};
	});
})();
