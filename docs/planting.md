# Keszlettel kapcsolatos dolgok

## Leltarkeszito (manual)

- cel: tudjuk, hogy mibol mennyi van/lesz, felul tudjuk irni a szamitasokat, ill. tudjuk, hogy mit kell feltolteni a webshopba/vinni a piacra
- kulcs: termek (cikkszam / termeknev)
- input:
    - kezi
        - webshopbol keszlet (kezzel)
        - webshopos ar (kezzel)
        - leltarkeszites napja (kezzel)
        - selejt/korrekcio
        - regi keszletbol maradek
        - uj hutos keszlet
        - piacra elvisszuk
    - raktarkeszlet 1 (szamolt, a webshopbol + fenti korrekciok)
    - rendelesre szuretelheto vetesek (raktarkeszlet 2 szamitashoz)
    - halalszuret datuma - ez bonyolult egyelore (ignore V, W, X)
    - raktarkeszlet ertekeket ki kell szamolni

## Leltarimportalo (query)

- cel: formatum atalakitas webshop import kompatibilisse
- celkozonseg: Melinda
- kulcs: termek (cikkszam)
- input: leltarkeszito


## Piaclista (query + manual)

- cel: mit/mennyit viszunk a piacra, ill. mit hoztunk vissza, Imi ez alapjan tudja, hogy mit kell vinnie a piacra
- celkozonseg: piacra meno ember (Imi)
- kulcs: termek
- input:
    - leltarkeszito
    - manualis sorok melleirva (nem jo!)


## Hutoleltar (query)

- cel: elvileg ennek kell lenni a hutoben. Ezt kinyomtatva szedi ossze Tundi a selejtet, es a napi szuretbol befolyo uj keszletet.
- celkozonseg: Tundi
- kulcs: termek (termeknev)
- input:
    - leltarkeszito


## Beszerzesi lista [keszito] (manualis)

- cel: beszerzesi lista keszitot ki lehessen nyomtatni
- celkozonseg: Melinda
- kulcs: termek (cikkszam)
- input:
    - manualis
        - webshopbol beszerezesi lista
        - beszerzesi listan importjanak datuma
        - manualis adatok
    - leltarkeszito
        - raktar1 / raktar2


## Beszerzesi lista nyomtato (rendeles szurethez) (query)

- cel: nyomtathato lista arrol, hogy mit honnan kell adott napon szuretelni; plusz erre a papirra irjak ra, hogy mi lett leszuretelve, a vegen ez visszakerul a beszerzesi lista keszitobe es a leltarkeszitobe
- celkozonseg: Tundi
- kulcs: termek (temrkenev)
- input:
    - beszerzesi lista


## Rendelesen kivuli szuretlista nyomtato (query)

- cel: nyomtathato lista arrol, hogy mit honnan kell adott napon szuretelni; plusz erre a papirra irjak ra, hogy mi lett leszuretelve, a vegen ez visszakerul a leltarkeszitobe [ennek is be kene kerulni a beszerzesi listaba]
- celkozonseg: Tundi
- kulcs: termek (termeknev) [jo lenne agyas szerint rendezni]
- input:
    - agyaslista (melyik agyas van 'napi' vagy 'heti' szuret allapotban)
    - vetesnaplobol kikeresi, hogy melyik a legfrissebb vetes az adott agyashoz


## Csirazas, Atultetes1, Atultetes2, Kiultetes, Elso szuret, Halalszuretelendo vetesek (query)

- cel: mik a potencialisan csirazo, atultetendo, kiultetendo, szuretelheto, halalszuretelendo agyasok (ami mar 3 hete szuretelve van); a halalszuretben leszedett mennyiseg aztan bemegy a leltarkeszitobe
- celkozonseg: T-k
- kulcs: agyas (agyasszam)
- input:
    - vetesnaplo (agyasszamok, termeny, halalszuret terv idopont)


## Rendelesre szuretelheto vetesek (query)

- cel: milyen termeny melyik agyasban talalhato, de csak a rendelesre szuretelhetok (agyas allapot = 'rendelesre')
- celkozonseg:
- kulcs: termeny (termenynev)
- input: veteslog


## Szuretelheto osszes (query)

- cel: milyen termeny melyik agyasban talalhato, osszes termeny
- celkozonseg:
- kulcs: termeny (termenynev)
- input: veteslog
