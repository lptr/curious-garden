

// Done
function csirazasIdeje(row) {
  return row.vetesIdeje + Fajok.CsirazasOptimalis(faj);
}


// 1. atultetes
=REPEATROWS("1. átültetés tervezett napja",
  IF(ISBLANK({{Vetestervezo.VetesTervezettIdeje}}),
    ,
    IF({{Vetestervezo.Mibe}} = "mini",
      {{Vetestervezo.CsirazasNapja}} + 1,
      IF({{Vetestervezo.Mibe}} = "kicsi",
        NA(),
        IF({{Vetestervezo.Mibe}} = "normál",
          IF({{Vetestervezo.PalantazasOsszIdeje}} >= 28,
            {{Vetestervezo.CsirazasNapja}} + 21,
            NA()
          ),
          NA()
        )
      )
    )
  )
)

function elsoAtultetesIdeje(row) {
  switch (row.mibe) {
    case "mini":
      return row.csirazasIdeje + 1; // nap
    case "kicsi":
      return NA();
    case "normál":
      if (row.osszPalantazasiIdo >= 28) { // BH oszlop, nap
        return row.csirazasIdeje + 21; // nap
      } else {
        return NA();
      }
    case "nagy":
    default:
      return NA();
  }
}

// 2. atultetes
=REPEATROWS("2. átültetés tervezett napja",
  IF(ISBLANK({{Vetestervezo.VetesTervezettIdeje}}),
    ,
    IF({{Vetestervezo.Mibe}} = "mini",
      {{Vetestervezo.CsirazasNapja}} + 1 + 21,
      NA()
    )
  )
)

function masodikAtultetesIdeje(row) {
  if (row.mibe == "mini") {
    return row.csirazasIdeje + 1 + 21; // nap
  } else {
    return NA();
  }
}

// Kiultetes

=REPEATROWS("Kiültetés tervezett napja",
  IF(ISBLANK({{Vetestervezo.VetesTervezettIdeje}}),
    ,
    {{Vetestervezo.VetesTervezettIdeje}} + {{Vetestervezo.PalantazasOsszIdeje}}
  )
)

function kiultetesNapja(row) {
  return row.vetesIdeje + row.osszPalantazasiIdo;
}

=REPEATROWS("Halálszüret tervezett napja",
  IF(ISBLANK({{Vetestervezo.VetesTervezettIdeje}}),
    ,
    {{DB:DB}} + {{Vetestervezo.HanyHetenAtSzuretelunk}} * 7
  )
)

function halalszuretNapja(row) {
  row.elsoSzuretNapja + row.hanyHetenAtSzureteljuk * 7;
}
