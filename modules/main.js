(function () {
	var app = angular.module("kapa", [
		"kapa.services",
		"kapa.transactions",
		"kapa.work",
		"kapa.import",
		"ngRoute",
		"ui.bootstrap.modal"
	]);
	app.config(function ($locationProvider) {
		$locationProvider.html5Mode(true);
	});

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

	app.controller("GoogleLoginController", function ($scope, $modal, kapaServer) {
		kapaServer.query("getUser", null, true).error(function () {
			$modal.open({
				templateUrl: "access-denied.html",
				backdrop: "static",
				keyboard: false
			});
		});
	});	

	app.controller("NavLinksController", function ($scope, $location) {
		$scope.isActive = function (viewLocation) {
			var path = $location.path();
			return path.match(viewLocation);
		};
	});
})();
