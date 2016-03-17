(function() {
	var module = angular.module("kapa.printing.planting", [
		"kapa.services",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	module.config(function($routeProvider) {
		$routeProvider
			.when('/printing/planting', {
				templateUrl: 'modules/printing/planting/module.html'
			});
	});

	module.controller("PlantingLabelPrinterController", function ($scope, $filter, $templateRequest, $compile, $timeout, plantingLabelManager, log) {
		$scope.labels = [];
		$scope.selectAll = function (selected) {
			$scope.labels.forEach(function (label) {
				label.selected = selected;
			});
		}

		log("Vetés matricák betöltése... (amíg tölt, nem lehet matricát nyomtatni)");
		var plantingLabelsFetched = plantingLabelManager.fetch();
		plantingLabelsFetched.then(function (labels) {
			labels.forEach(function (label) {
				label.selected = true;
				label.plantingDate = new Date(Date.parse(label.plantingDate));
				label.germinationDate = new Date(Date.parse(label.germinationDate));
				label.firstHarvestDate = new Date(Date.parse(label.firstHarvestDate));
				label.lastHarvestDate = new Date(Date.parse(label.lastHarvestDate));
			});
			$scope.labels = labels;
			log("Vetés matricák betöltve");
		});

		$scope.printLabels = function() {
			$templateRequest("modules/printing/planting/print-planting-labels.html").then(function (template) {
				$timeout(function () {
					var linkFn = $compile(template);
					var linkedContent = linkFn($scope);
					$scope.$apply();
					var printContents = linkedContent.html();

					var printWindow = window.open("about:blank", "KAPA_PrintOrders", "width=800, height=600");
					if (!printWindow) {
						alert("Nem tudom megnyitni a nyomtatási ablakot");
						return;
					}

					printWindow.document.open();
					printWindow.document.write(
						'<!doctype html><html><head>'
						+ '<meta charset="utf-8"/>'
						+ '<link rel="stylesheet" type="text/css" href="modules/printing/print-labels.css" />'
						+ '<link rel="stylesheet" type="text/css" href="modules/printing/planting/print-planting-labels.css" />'
						+ '</head><body>' + printContents + '</body></html>'
					);

					$(printWindow).load(function () {
						printWindow.focus();
						printWindow.print();
					});
				}, 0);
			});
		}
	});
})();
