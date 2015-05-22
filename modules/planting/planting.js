(function () {
	var plantingModule = angular.module("kapa.planting", [
		"kapa.services",
		"kapa.utils.tables",
		"ngRoute",
		"ui.bootstrap",
		"ui.bootstrap.showErrors"
	]);

	plantingModule.config(function ($routeProvider) {
		$routeProvider
			.when('/planting', {
				templateUrl: 'modules/planting/planting.html'
			});
	});
	
	plantingModule.factory("Szinek", function (tables) {
		return new tables.Table({
			name: "Színek",
			properties: [
				{ name: "nev", title: "Szín" },
				{ name: "name", title: "Color" },
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("SzinekController", function ($scope, kapaServer, Szinek) {
		$scope.table = Szinek;
	});
	
	plantingModule.factory("KereskedelmiJellegek", function (tables) {
		return new tables.Table({
			name: "Kereskedelmi jellegek",
			properties: [
				{ name: "nev", title: "Kereskedelmi jelleg" },
				{ name: "name", title: "Commercial type" },
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("KereskedelmiJellegekController", function ($scope, kapaServer, KereskedelmiJellegek) {
		$scope.table = KereskedelmiJellegek;
	});
	
	plantingModule.factory("Termekkategoriak", function (tables) {
		return new tables.Table({
			name: "Termékkategóriák",
			properties: [
				{ name: "nev", title: "Kategória" },
				{ name: "name", title: "Category" },
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("TermekkategoriakController", function ($scope, kapaServer, Termekkategoriak) {
		$scope.table = Termekkategoriak;
	});
	
	plantingModule.factory("Felhasznalasok", function (tables) {
		return new tables.Table({
			name: "Felhasználások",
			properties: [
				{ name: "nev", title: "Felhasználás" },
				{ name: "name", title: "Usage" },
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("FelhasznalasokController", function ($scope, kapaServer, Felhasznalasok) {
		$scope.table = Felhasznalasok;
	});
	
	plantingModule.factory("Egysegek", function (tables) {
		return new tables.Table({
			name: "Egységek",
			properties: [
				{ name: "nev", title: "Egység" },
				{ name: "rovid", title: "Rövidítés" },
				{ name: "name", title: "Unit" },
				{ name: "abbrev", title: "Abbreviation" },
			],
			titleProperty: "rovid"
		});
	});

	plantingModule.controller("EgysegekController", function ($scope, kapaServer, Egysegek) {
		$scope.table = Egysegek;
	});
	
	plantingModule.factory("Fajok", function (tables, formulas) {
		return new tables.Table({
			name: "Fajok",
			properties: [
				{ name: "nev", title: "Név", width: 120 },
				{ name: "name", title: "Name", width: 120 },
				{ name: "csoport", title: "Növénytani csoport" },
				{ name: "optimalisHomerseklet", title: "Optimális hőmérséklet", unit: "℃" },
				{ name: "csirazas5c",  title: "5℃",  type: "numeric", width: 30 },
				{ name: "csirazas10c", title: "10℃", type: "numeric", width: 30 },
				{ name: "csirazas15c", title: "15℃", type: "numeric", width: 30 },
				{ name: "csirazas20c", title: "20℃", type: "numeric", width: 30 },
				{ name: "csirazas25c", title: "25℃", type: "numeric", width: 30 },
				{ name: "csirazas30c", title: "30℃", type: "numeric", width: 30 },
				{ name: "csirazas35c", title: "35℃", type: "numeric", width: 30 },
				{ name: "csirazas40c", title: "40℃", type: "numeric", width: 30 },
				{ name: "optialisCsirazas", title: "Optiomalis csírázás", unit: "nap",
					calculate: function (csirazas5c, csirazas10c, csirazas15c, csirazas20c, csirazas25c, csirazas30c, csirazas35c, csirazas40c) {
						return formulas.min(arguments);
					}
				},
				{ name: "magPerGramm", title: "Magok száma", unit: "db/g" },
				{ name: "palantazasIdeje", title: "Palántázás ideje", unit: "hét" }
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("FajokController", function ($scope, kapaServer, Fajok) {
		$scope.table = Fajok;
	});
	
	plantingModule.factory("Magtipusok", function (tables, formulas, Fajok, Szinek, KereskedelmiJellegek) {
		return new tables.Table({
			name: "Magtípusok",
			properties: [
				{ name: "nev", title: "Név", width: 240,
					calculate: function (faj, fajtanev, gyarto) {
						if (faj.value()) {
							return formulas.join(arguments);
						} else {
							return "NINCS FAJ: " + formulas.join(arguments);
						}
					}
				},
				{ name: "faj", title: "Faj", target: Fajok, width: 120 },
				{ name: "fajtanev", title: "Fajtanév" },
				{ name: "gyarto", title: "Gyártó", width: 200 },
				{ name: "szin", title: "Szín", target: Szinek },
				{ name: "kereskedelmiJelleg", title: "Kereskedelmi jelleg", target: KereskedelmiJellegek },
				{ name: "kerteszetiHabitus", title: "Kertészeti habitus", type: "dropdown",
					column: {
						source: [
							"alacsony", "bokor", "cornuta", "fejesedő", "fodroslevelű", "futó", "félfutó", "hajtatásra", "indátlan", "levél", "magas", "metélő", "nyári", "törpe", "wittrockiana", "óriás"
						]
					}
				},
				{ name: "forma", title: "Forma" },
				{ name: "hetiVetes", title: "Heti vetés", type: "checkbox", width: 60, column: {
					checkedTemplate: "igen",
					uncheckedTemplate: "nem"
				} },
				{ name: "magPerGramm", title: "Magok száma", type: "numeric",
					calculateDefault: function (faj) {
						return faj.value() ? faj.value().get("magPerGramm") : null;
					}
				},
				{ name: "egyszeruId", title: "Egyszerű ID", width: 200,
					calculate: function (fajtanev, gyarto) {
						return formulas.join(arguments);
					}
				},
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("MagtipusokController", function ($scope, kapaServer, Magtipusok) {
		$scope.table = Magtipusok;
	});
	
	plantingModule.factory("Magvasarlasok", function (tables, formulas, Magtipusok) {
		return new tables.Table({
			name: "Magvásárlások",
			properties: [
				{ name: "datum", title: "Dátum", type: "date", column: {
					dateFormat: "YYYY-MM-DD"
				}},
				{ name: "mag", title: "Mag", width: 300, target: Magtipusok },
				{ name: "mennyiseg", title: "Mennyiség", unit: "g" },
				{ name: "ar", title: "Ár", type: "numeric", width: 60 },
				{ name: "penznem", title: "Pénznem", type: "dropdown", width: 60, column: {
					source: [ "HUF", "EUR", "GBP", "USD" ]
				}},
				{ name: "memo", title: "Memo", width: 300 },
			],
			titleProperty: "mag"
		});
	});

	plantingModule.controller("MagvasarlasokController", function ($scope, kapaServer, Magvasarlasok) {
		$scope.table = Magvasarlasok;
	});
	
	plantingModule.factory("Termenyek", function (tables, formulas, Egysegek, Fajok, Felhasznalasok, KereskedelmiJellegek, Szinek, Termekkategoriak) {
		return new tables.Table({
			name: "Termények",
			properties: [
				{ name: "nev", title: "Név", width: 240,
					calculate: function (faj, felhasznalas, kereskedelmiJelleg, szin, meret) {
						if (faj.value()) {
							return formulas.join([faj.asText() + felhasznalas.asText(), kereskedelmiJelleg, szin, meret]);
						} else {
							return "NINCS FAJ: " + formulas.join(arguments);
						}
					}
				},
				{ name: "faj", title: "Faj", target: Fajok, width: 140 },
				{ name: "elsodlegesKategoria", title: "Elsődleges kategória", target: Termekkategoriak, width: 120 },
				{ name: "felhasznalas", title: "Felhasználás", target: Felhasznalasok },
				{ name: "kereskedelmiJelleg", title: "Kereskedelmi jelleg", target: KereskedelmiJellegek },
				{ name: "szin", title: "Szín", target: Szinek },
				{ name: "meret", title: "Méret", width: 50, type: "dropdown", column: {
					source: [ "XXS", "XS", "S", "M", "" ]
				}},
				{ name: "sorkoz", title: "Vetési sorköz", unit: "cm" },
				{ name: "novenykoz", title: "Vetési növényköz", unit: "cm" },
				{ name: "termekcsoport", title: "Termékcsoport", width: 200,
					calculate: function (faj, felhasznalas, meret) {
						if (faj.value()) {
							var value = faj.asText() + felhasznalas.asText();
							if (meret.asText()) {
								value += " " + meret.asText();
							}
							return value;
						} else {
							return "NINCS FAJ: " + formulas.join(arguments);
						}
					}
				},
				{ name: "statusz", title: "Státusz", type: "dropdown", column: {
					source: [ "ismert", "félig ismert", "kísérleti", "" ]
				}},
				{ name: "teliTermeny", title: "Téli termény", type: "dropdown", column: {
					source: [ "igen", "nem", "tárolva", "kis fagyig", "" ]
				}},
				{ name: "elsoSzuret", title: "Első szüret", unit: ". hét" },
				{ name: "hanyHetenteSzuretelunk", title: "Hány hetente szüretelunk?", unit: "hetente" },
				{ name: "hanyHetenAtSzuretelunk", title: "Hány heten át szüretelunk?", unit: "hét" },
				{ name: "szuretekSzama", title: "Szüretek száma", type: "numeric",
					calculate: function (hanyHetenAtSzuretelunk, hanyHetenteSzuretelunk) {
						return Math.floor(hanyHetenAtSzuretelunk.asNumber() / hanyHetenteSzuretelunk.asNumber());
					}
				},
				{ name: "kiszereles", title: "Kiszerelés", target: Egysegek },
				{ name: "egysegPerSzuretPerM2", title: "Egység / szüret / m2", type: "numeric" },
				{ name: "sulyPerDb", title: "Süly / db", unit: "g" },
				{ name: "egysegar", title: "Egységár", unit: "Ft" },
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("TermenyekController", function ($scope, kapaServer, Termenyek) {
		$scope.table = Termenyek;
	});

	plantingModule.factory("Termekek", function (tables, formulas, Egysegek, Termenyek) {
		return new tables.Table({
			name: "Termékek",
			properties: [
				{ name: "nev", title: "Név", width: 240,
					calculate: function (termeny, kiszereles) {
						return termeny.asText() + ", " + (kiszereles.value() ? kiszereles.value().toString() : "??");
					}
				},
				{ name: "termeny", title: "Termény", target: Termenyek, width: 200 },
				{ name: "kiszereles", title: "Kiszerelés", target: Egysegek, width: 60 },
				{ name: "kategoria", title: "Kategória" },
				{ name: "alapar", title: "Alapár", unit: "Ft" },
				{ name: "raktarkeszlet1", title: "Raktárkészlet 1", type: "numeric" },
				{ name: "raktarkeszlet2", title: "Raktárkészlet 2", type: "numeric"  },
				{ name: "rovidLeirasHu", title: "Rövid leírás (HU)", width: 300 },
				{ name: "rovidLeirasEn", title: "Rövid leírás (EN)", width: 300 },
				{ name: "kategoriaId", title: "Kategória" },
				{ name: "memo", title: "Jegyzet", width: 200 },
			],
			titleProperty: "nev"
		});
	});

	plantingModule.controller("TermekekController", function ($scope, kapaServer, Termekek) {
		$scope.table = Termekek;
	});

	plantingModule.controller("ChangeTrackingController", function ($scope, changeTracking) {
		$scope.pending = 0;
		changeTracking.operationStartListeners.push(function () {
			$scope.pending++;
		});
		changeTracking.operationSuccessListeners.push(function () {
			$scope.pending--;
		});
		changeTracking.operationFailureListeners.push(function () {
			$scope.pending--;
		});
	});
})();
