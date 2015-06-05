(function () {
	var app = angular.module("kapa", [
		"kapa.services",
		"kapa.transactions",
		"kapa.planting",
		"kapa.work",
		"kapa.import",
		"kapa.labels",
		"ngRoute",
		"ui.bootstrap.modal"
	]);
	// app.config(function ($locationProvider) {
	// 	$locationProvider.html5Mode({
	// 		enabled: true
	// 	});
	// });

	app.config(function ($routeProvider) {
		$routeProvider
			.when("/", {
				templateUrl: "modules/main.html"
			});
	});

	$(function () {
		function tog(v) {
			return v ? 'addClass' : 'removeClass';
		}
		$(document).on('input', '.clearable', function() {
			$(this)[tog(this.value)]('x');
		}).on('mousemove', '.x', function(e) {
			$(this)[tog(this.offsetWidth - 18 < e.clientX - this.getBoundingClientRect().left)]('onX');
		}).on('click', '.onX', function() {
			$(this).removeClass('x onX').val('').change();
		});
	});

	app.controller("MainController", function ($scope, $modal, kapaServer) {
		$scope.user = {
			features: {}
		};
		kapaServer.query("getUser", null, true)
			.success(function (user) {
				$scope.user = user;
			})
			.error(function () {
				$modal.open({
					templateUrl: "access-denied.html",
					backdrop: "static",
					keyboard: false
				});
			});
	});

	app.controller("GoogleLoginDialogController", function ($scope, kapaServer) {
		$scope.loginLink = kapaServer.getUrl() + "?method=login";
	});

	app.controller("NavLinksController", function ($scope, $location) {
		$scope.isActive = function (viewLocation) {
			var path = $location.path();
			return path.match(viewLocation);
		};
	});
})();
