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

	plantingModule.factory("Gyartok", function (tables) {
		return new tables.Table({
			name: "Gyártók",
			properties: [
				{ name: "nev", title: "Név" },
			],
			filters: [ "nev" ],
			titleProperty: "nev"
		});
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
				{ name: "optimalisCsirazas", title: "Optiomalis csírázás", unit: "nap",
					calculate: function (csirazas5c, csirazas10c, csirazas15c, csirazas20c, csirazas25c, csirazas30c, csirazas35c, csirazas40c) {
						return formulas.min(arguments);
					}
				},
				{ name: "magPerGramm", title: "Magok száma", unit: "db/g", format: "#,000" },
				{ name: "palantazasIdeje", title: "Palántázás ideje", unit: "hét" }
			],
			filters: [ "nev" ],
			titleProperty: "nev"
		});
	});

	plantingModule.factory("Magtipusok", function (tables, formulas, Fajok, Gyartok, KereskedelmiJellegek, Szinek) {
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
				{ name: "gyarto", title: "Gyártó", target: Gyartok, width: 200 },
				{ name: "szin", title: "Szín", target: Szinek },
				{ name: "kereskedelmiJelleg", title: "Kereskedelmi jelleg", target: KereskedelmiJellegek },
				{ name: "kerteszetiHabitus", title: "Kertészeti habitus", type: "dropdown",
					source: [
						"alacsony", "bokor", "cornuta", "fejesedő", "fodroslevelű", "futó", "félfutó", "hajtatásra", "indátlan", "levél", "magas", "metélő", "nyári", "törpe", "wittrockiana", "óriás"
					]
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
			filters: [ "nev", "faj", "fajtanev", "gyarto", "szin", "kereskedelmiJelleg", "kerteszetiHabitus" ],
			titleProperty: "nev"
		});
	});

	plantingModule.factory("Magvasarlasok", function (tables, formulas, Magtipusok) {
		return new tables.Table({
			name: "Magvásárlások",
			properties: [
				{ name: "datum", title: "Dátum", type: "date", dateFormat: "YYYY-MM-DD" },
				{ name: "mag", title: "Mag", width: 300, target: Magtipusok },
				{ name: "mennyiseg", title: "Mennyiség", unit: "g", format: "#,000" },
				{ name: "ar", title: "Ár", type: "numeric", width: 60 },
				{ name: "penznem", title: "Pénznem", type: "dropdown", width: 60, source: [ "HUF", "EUR", "GBP", "USD" ] },
				{ name: "memo", title: "Memo", width: 300 },
			],
			titleProperty: "mag"
		});
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
				{ name: "meret", title: "Méret", width: 50, type: "dropdown", source: [ "XXS", "XS", "S", "M", "" ] },
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
				{ name: "statusz", title: "Státusz", type: "dropdown", source: [ "ismert", "félig ismert", "kísérleti", "" ] },
				{ name: "teliTermeny", title: "Téli termény", type: "dropdown", source: [ "igen", "nem", "tárolva", "kis fagyig", "" ] },
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
			filters: [ "nev" ],
			titleProperty: "nev"
		});
	});

	plantingModule.factory("Termekek", function (tables, formulas, Egysegek, Termenyek) {
		return new tables.Table({
			name: "Termékek",
			properties: [
				{ name: "nev", title: "Név", width: 240,
					calculate: function (termeny, kiszereles) {
						if (!termeny.value()) {
							return "NINCS Termeny";
						}
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

	var date = function (date) {
		if (!(date instanceof Date) || isNaN(date)) {
			return null;
		}
		var year = date.getFullYear();
		var month = date.getMonth() + 1;
		var day = date.getDate();
		if (month < 10) {
			month = "0" + month;
		}
		if (day < 10) {
			day = "0" + day;
		}
		return year + "-" + month + "-" + day;
	}

	plantingModule.factory("Vetestervezo", function (tables, formulas, Magtipusok, Termenyek) {
		return new tables.Table({
			name: "Vetéstervező",
			properties: [
				{ name: "termeny", title: "Termény", target: Termenyek, width: 200 },
				{ name: "mag", title: "Mag", target: Magtipusok, width: 200 },
				// TODO vanElegMag
				{ name: "vetesIdeje", title: "Tervezett időpont", type: "date", dateFormat: "YYYY-MM-DD" },
				{ name: "mibe", title: "Mibe", type: "dropdown", source: [ "föld", "normál", "szapláda" ] },
				{ name: "helyszin", title: "Helyszín", type: "dropdown", source: [ "ehető virágok", "fűszernövények", "kis zöldségek", "levelek", "palántázó", "zöldségek" ] },
				{ name: "agyas", title: "Ágyás", type: "numeric", width: 50 },
				{ name: "sav", title: "Sáv", type: "dropdown", width: 50, source: [ "A", "B", "C", "D" ] },
				{ name: "kosar", title: "Kosar", type: "dropdown", width: 50, source: [ "A", "B", "C", "D", "K" ],
					calculateDefault: function (mag) {
						var magPerGramm = mag.get("magPerGramm");
						if (!magPerGramm) {
							return null;
						}
						magPerGramm = magPerGramm.asNumber();
						if (magPerGramm <= 70) {
							return "K";
						} else if (magPerGramm <= 90) {
							return "D";
						} else if (magPerGramm <= 100) {
							return "C";
						} else if (magPerGramm <= 300) {
							return "B";
						} else {
							return "A";
						}
					}
				},
				{ name: "egysegekSzama", title: "Hány egység", type: "numeric", format: "0.0" },
				{ name: "egyseg", title: "Egység", type: "dropdown", source: [ "szapláda", "sor", "sáv", "ágyás" ] },
				{ name: "sorkoz", title: "Vetési sorköz", unit: "cm",
					calculateDefault: function (termeny) {
						return termeny.value() ? termeny.value().get("sorkoz") : null;
					}
				},
				{ name: "novenykoz", title: "Vetési növényköz", unit: "cm",
					calculateDefault: function (termeny) {
						return termeny.value() ? termeny.value().get("novenykoz") : null;
					}
				},
				{ name: "melyseg", title: "Vetési mélység", unit: "cm", format: "0.0",
					calculateDefault: function (mag) {
						var magPerGramm = mag.get("magPerGramm");
						if (!magPerGramm) {
							return null;
						}
						magPerGramm = magPerGramm.asNumber();
						if (magPerGramm <= 0.1) {
							return 5;
						} else if (magPerGramm <= 1) {
							return 3;
						} else if (magPerGramm <= 10) {
							return 2;
						} else if (magPerGramm <= 50) {
							return 1;
						} else if (magPerGramm <= 200) {
							return 0.5;
						} else {
							return 0.2;
						}
					}
				},
				{ name: "terulet", title: "Terület", unit: "m²", format: "0.00",
					calculate: function (egyseg, egysegekSzama, sorkoz) {
						if (!egyseg.value()) {
							return null;
						}
						var egysegnyiTerulet;
						switch (egyseg.value()) {
							case "szapláda":
								egysegnyiTerulet = 0.3 * 0.6;
								break;
							case "sor":
								if (!sorkoz.value()) {
									return null;
								}
								egysegnyiTerulet = 3.6 * sorkoz.asNumber() / 100;
								break;
							case "sáv":
								egysegnyiTerulet = 0.3 * 3.6;
								break;
							case "ágyás":
								egysegnyiTerulet = 1.2 * 3.6;
								break;
							default:
								return null;
						}
						return egysegnyiTerulet * egysegekSzama.asNumber();
					}
				},
				{ name: "sorokSzama", title: "Sorok száma", unit: "sor", format: "0.0",
					calculateDefault: function (kosar, sorkoz) {
					}
				},
				{ name: "szorzo", title: "Szorzó", type: "numeric", format: "+0%",
					calculateDefault: function () {
						return 0;
					}
				},
				{ name: "fedokomposztMennyisege", title: "Fedőkomposzt mennyisége", unit: "l", format: "0.0",
					calculate: function (melyseg, terulet) {
						return melyseg.asNumber() / 100 * terulet.asNumber() * 1000;
					}
				},
				{ name: "ontozes", title: "Öntözés", type: "dropdown",
					source: [ "adatra vár", "csepicső", "csepicső+gomba", "eldöntendő", "gomba", "szórófejes" ],
					calculateDefault: function (sorkoz, novenykoz) {
						if (sorkoz.asNumber() < 12) {
							return "szórófejes";
						} else if (novenykoz.asNumber() === 30) {
							return "csepicső";
						} else if (novenykoz.asNumber() === 15) {
							return "csepicső+gomba";
						} else if (novenykoz.asNumber() > 30) {
							return "gomba";
						} else if (novenykoz.value()) {
							return "eldöntendő";
						} else {
							return "adatra vár";
						}
					}
				},
				// TODO What is this?
				{ name: "hanySzal", title: "Hány szál", unit: "szál",
					calculateDefault: function (sorkoz, ontozes) {
						if (ontozes.value() === "szórófejes") {
							return null;
						} else if (sorkoz.asNumber() > 60) {
							return 1;
						} else if (sorkoz.asNumber() === 60) {
							return 2;
						} else if (sorkoz.asNumber() === 40) {
							return 3;
						} else if (sorkoz.asNumber() === 30) {
							return 4;
						} else if (sorkoz.asNumber() == 20) {
							return 5;
						} else if (sorkoz.value()) {
							return "eldöntendő";
						} else {
							return "adatra vár";
						}
					}
				},
				{ name: "agyaselokeszitesiMegjegyzes", title: "Ágyáselőkészítési megjegyzés", width: 300 },
				{ name: "vetesiMegjegyzes", title: "Vetési megjegyzés", width: 300 },
				{ name: "magMennyisegeSoronkent", title: "Mag mennyisége", unit: "g/sor", format: "0.00",
					calculate: function (novenykoz, mag, szorzo) {
						var magPerGramm = mag.get("magPerGramm");
						if (!magPerGramm) {
							return null;
						}
						return 3.6 / (novenykoz.asNumber() / 100) / magPerGramm.asNumber() * (1 + szorzo.asNumber());
					}
				},
				{ name: "tasakbaKeruloMagmennyiseg", title: "Tasakba kerülő magnennyiség", unit: "g", format: "0.00",
					calculate: function (magMennyisegeSoronkent, sorokSzama) {
						return magMennyisegeSoronkent.asNumber() * sorokSzama.asNumber();
					}
				},
				{ name: "darab", title: "DB", unit: "db",
					calculate: function (novenykoz, szorzo, sorokSzama) {
						return 3.6 / (novenykoz.asNumber() / 100) * (1 + szorzo.asNumber()) * sorokSzama.asNumber();
					}
				},
				{ name: "csirazasIdeje", title: "Csírázás tervezett ideje", type: "date",
					calculateDefault: function (vetesIdeje, termeny) {
						var faj = termeny.get("faj");
						if (!faj) {
							return null;
						}
						var optimalisCsirazas = faj.get("optimalisCsirazas");
						var result = formulas.addDays(vetesIdeje, optimalisCsirazas || 0);
						return date(result);
					}
				},
				{ name: "elsoAtultetesIdeje", title: "1. átültetés tervezett ideje", type: "date",
					calculateDefault: function (csirazasIdeje, mibe) {
						if (mibe.asText() === "mini") {
							return date(formulas.addDays(csirazasIdeje, 1));
						} else {
							return null;
						}
					}
				},
				{ name: "masodikAtultetesIdeje", title: "2. átültetés tervezett ideje", type: "date" },
				{ name: "kiultetesIdeje", title: "Kiültetés tervezett ideje", type: "date",
					calculateDefault: function (vetesIdeje, mibe) {
						if (mibe.asText() === "mini" || mibe.asText() == "normál") {
							return date(formulas.addDays(vetesIdeje, 30));
						} else {
							return null;
						}
					}
				},
				{ name: "szuretIdeje", title: "Szüret tervezett ideje", type: "date",
					calculateDefault: function (vetesIdeje, termeny) {
						var elsoSzuret = termeny.get("elsoSzuret");
						if (!elsoSzuret) {
							return null;
						}
						return date(formulas.addDays(vetesIdeje, elsoSzuret.asNumber() * 7));
					}
				},
				{ name: "halalszuretIdeje", title: "Halálszüret tervezett ideje", type: "date",
					calculateDefault: function (vetesIdeje, termeny) {
						var elsoSzuret = termeny.get("elsoSzuret");
						if (!elsoSzuret) {
							return null;
						}
						var szuretekSzama = termeny.get("szuretekSzama");
						if (!szuretekSzama) {
							return null;
						}
						var hanyHetenteSzuretelunk = termeny.get("hanyHetenteSzuretelunk");
						if (!hanyHetenteSzuretelunk) {
							return null;
						}
						return date(formulas.addDays(vetesIdeje,
							elsoSzuret.asNumber() * 7
							+ Math.max(0, (szuretekSzama.asNumber() - 1) * hanyHetenteSzuretelunk.asNumber() * 7)
						));
					}
				},
			],
			settings: {
				fixedColumnsLeft: 3
			}
		});
	});

	plantingModule.controller("TablesController", function ($scope, tables,
			Egysegek,
			Fajok,
			Felhasznalasok,
			Gyartok,
			KereskedelmiJellegek,
			Magtipusok,
			Magvasarlasok,
			Szinek,
			Termenyek,
			Termekek,
			Termekkategoriak,
			Vetestervezo
		) {
		$scope.tables = _.filter(arguments, function (dependency) { return dependency instanceof tables.Table; }).sort(function (a, b) {
			return a.name.localeCompare(b.name, "hu");
		});
		$scope.failed = {};
		$scope.enabled = {};
		$scope.tables.forEach(function (table) {
			table.stateListeners.push(function (table, state) {
				switch (state) {
					case tables.TableState.READY:
						$scope.$apply(function () {
							$scope.enabled[table.name] = true;
						});
						break;
					case tables.TableState.FAILED:
						$scope.$apply(function () {
							$scope.failed[table.name] = true;
						});
						break;
				}
			});
		});
		$scope.selected = $scope.tables[0];
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
