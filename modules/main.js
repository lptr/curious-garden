(function () {
	var app = angular.module("kapa", ["kapa.transactions", "kapa.work", "ngRoute"]);
//	app.config(function ($locationProvider) {
//		$locationProvider.html5Mode(true);
//	});

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

	app.controller("NavLinksController", function ($scope, $location) {
		$scope.isActive = function (viewLocation) {
			var path = $location.path();
			return path.match(viewLocation);
		};
	});
})();
