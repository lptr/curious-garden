(function () {
	var app = angular.module("kapa", ["kapa.transactions", "ngRoute"]);
//	app.config(function ($locationProvider) {
//		$locationProvider.html5Mode(true);
//	});

	app.config(function ($routeProvider) {
		$routeProvider
			.when("/", {
				templateUrl: "modules/main.html"
			});
	});
})();
