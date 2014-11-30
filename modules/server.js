(function () {
	var getQueryString = function () {
		var result = {}
		var queryString = location.search.slice(1);
		var re = /([^&=]+)=([^&]*)/g;
		var m;

		while (m = re.exec(queryString)) {
			result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
		}

		return result;
	}

	var server = angular.module("kapa.server", []);
	server.factory("kapaServer", function ($http, $location) {
		var development = getQueryString()["dev"];
		var serverUrl;
		if (development) {
			serverUrl = "https://script.google.com/macros/s/AKfycbzr__tdtQoB4Hg9mJOCaK8Y9AL8Fwx4uyIxHefJSis/dev";
		} else {
			serverUrl = "https://script.google.com/macros/s/AKfycbwBGeZPzlmi-4wu23s3NyQP0T1rE71750FNYOFPAozPignicus/exec"
		}
		return {
			query: function (method, data) {
				return $http.jsonp(serverUrl, {
					params: {
						method: method,
						data: JSON.stringify(data),
						callback: "JSON_CALLBACK"
					}
				}).error(function(data, status, headers, config) {
					console.log("Error", data, status, headers, config);
					alert("Error: " + error);
				});
			}
		}
	});
})();
