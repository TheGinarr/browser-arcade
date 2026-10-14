/* ============================================================
   Angelglück · game.js
   ------------------------------------------------------------
   SO FUNKTIONIERT DIESES SPIEL
   1. Ein Angel-Slot mit 5 Walzen und je 3 sichtbaren Reihen (5x3-Fenster).
      Gewertet wird auf 10 FESTEN Gewinnlinien. Jede Linie ist in der
      Konstante LINIEN ein Array mit 5 Zahlen (eine Reihe pro Walze). Von der
      linken Walze aus zählen mindestens 3 gleiche Symbole nebeneinander.
   2. Der Gesamteinsatz (10 / 25 / 50 / 100) verteilt sich auf die 10 Linien:
      Linien-Gewinn = Quote x Einsatz / 10, auf ganze Zahlen gerundet.
   3. Besondere Symbole: Der ANGLER ist WILD (ersetzt alles außer dem Boot),
      das FISCHERBOOT ist SCATTER (zählt überall im Fenster, nicht auf Linien).
      Drei oder mehr Boote zahlen den doppelten Gesamteinsatz und lösen
      10 FREISPIELE aus. Der FISCH ist im Basisspiel ein normales Symbol.
   4. DAS SAMMEL-FEATURE (nur in Freispielen): Jeder Fisch trägt jetzt einen
      sichtbaren Geldwert (x0,5 / x1 / x2 / x5 / x10 vom Gesamteinsatz, kleine
      Werte häufig). Landet ein Angler im Fenster, sammelt er die Werte ALLER
      sichtbaren Fische ein, zusätzlich zu den normalen Liniengewinnen. Mehrere
      Angler sammeln mehrfach, Fische ohne Angler zahlen nichts extra.
      Drei Boote in den Freispielen bringen weitere 10 Freispiele.
   5. Jede Walze ist ein festes Array (das "Walzenband") mit 30 Feldern. Wie
      oft ein Symbol im Array steht, bestimmt seine Wahrscheinlichkeit. In
      den Freispielen gelten leicht angepasste Bänder (BAENDER_FREISPIEL):
      mehr Fische (vor allem Walze 1) und mehr Angler (Walze 5).
   6. Ein Dreh: Einsatz abbuchen -> pro Walze einen Stopp-Index würfeln ->
      alles auswerten -> Walzen animiert auslaufen lassen -> Auszahlung
      gutschreiben. Das Ergebnis steht fest, bevor sich die Walzen bewegen;
      die Animation ist nur Show.
   7. Die Regeln stehen in reinen Funktionen (linieAuswerten, linienAuswerten,
      scatterAuswerten, fischeSammeln, drehAuswerten, bezahltenDrehSimulieren
      …). Sie kennen kein DOM und lassen sich in Node testen und simulieren.
   8. Das Geld läuft NUR über ../assets/wallet.js (gemeinsames Konto aller
      Casino-Spiele). Der Einsatz wird nur beim bezahlten Dreh abgebucht;
      Freispiele sind kostenlos. Die Auszahlung der ganzen Runde (Linien +
      Scatter + gesammelte Fischwerte, Freispiele inklusive) wird EINMAL am
      Ende mit rundeAbschliessen() gebucht. Angelglück-eigen sind nur die
      Topliste (Schlüssel "angelglueck"), der gemerkte Einsatz und der Stand
      einer laufenden Freispiel-Serie.
   9. GEWINNFEIER: Große Gewinne werden eskalierend gefeiert (assets/gewinnfeier.js, Stufen ab
      x5 / x15 / x40 vom Gesamteinsatz): jeder Dreh einzeln, am Ende einer Freispiel-Serie zusätzlich
      der Seriengesamtgewinn, aber nur bei höherer Stufe als zuvor. Reine Anzeige NACH der
      Auswertung, an Auszahlung, RTP und Konto ändert sie nichts.
  10. TON UND SPANNUNG: assets/klang.js liefert synthetisierte Klänge (Dreh-Surren, Stopp-Tick je Walze,
      Gewinn-Jingle je Feier-Stufe, Münz-Ticks). Dazu kommen Scatter-Spannung, "So knapp!" und ein
      Lauflicht-Rahmen ums Fenster (siehe Block SPANNUNG weiter unten). Der Ton lässt sich oben rechts abschalten.
  11. GEWINNLINIEN-TABS: Links und rechts vom Walzenfenster sitzen die farbigen Nummern-Tabs der 10 Linien
      (assets/gewinnlinien.js). Hover oder Tippen zeigt den Verlauf der Linie als Polylinie, aus LINIEN
      gezeichnet. Gewinnt eine Linie, leuchten Tab und Linie in derselben Farbe. Reine Anzeige: Auszahlung,
      RTP und Freispiele bleiben unberührt.

   AUSZAHLUNGSQUOTE (RTP) – ERGEBNIS
   Die Abstimmung zielt auf eine RTP von 95,0 % (Korridor 94,5 bis 95,5 %), leicht über den üblichen
   Werten echter Geräte, und auf eine spürbar höhere Trefferquote im Basisspiel (rund 42 % statt vorher
   rund 39 %). Erreicht wurde das über MEHR NIEDRIGE SYMBOLE im Band (19 von 30 Feldern) und eine
   Muschel/Seestern-Quote 5 / 12 / 40 (vorher 4 / 12 / 40), nicht über seltene Jackpots.

   Basisspiel, EXAKT: Alle 30^5 = 24.300.000 Stopp-Kombinationen wurden einmal
   durchgespielt (tests/angelglueck-exakt.mjs, Einsatz 10, keine Zufallszahlen nötig):
     Linien + Scatter-Gewinn  = 0,6228  (62,28 %)
     Trefferquote Linien      = 41,35 %
     Trefferquote gesamt      = 42,06 %  (irgendeine Auszahlung, Linien oder Scatter)
       davon unter dem Einsatz  44,4 %   (Gewinn-Optik, aber Netto-Verlust)
     Freispiel-Auslöser       = 1 : 116,8  (0,856 % der bezahlten Drehs)
   Freispiele und Sammel-Feature sind zufallsabhängig (Fischwerte, erneute
   Auslösung) und deshalb nur per SIMULATION messbar. Gemessen mit der Funktion
   bezahltenDrehSimulieren() (ein bezahlter Dreh inklusive aller Freispiele),
   Zufallsgenerator mulberry32 (wiederholbar, statt Math.random), Einsatz 10,
   24 Läufe (Seeds 1 bis 24) zu je 5.000.000 bezahlten Drehs:
     120.000.000 bezahlte Drehs: RTP gesamt        = 0,9513  (95,13 %)
                                 davon Basisspiel  = 0,6226
                                 davon Freispiele  = 0,3287  = 34,6 % aller Auszahlungen
                                 Freispiele je Auslöser im Schnitt = 10,94
                                 Trefferquote Basisspiel = 42,05 %  (57,95 % der Drehs zahlen nichts)
     Einzelläufe (je 5 Mio.) 94,72 % bis 95,46 %, Standardfehler des Gesamtwerts 0,04 Prozentpunkte
     Höchste einzelne Auszahlung einer Runde: 348 Einsätze
     je 5.000.000 Drehs bei Einsatz 50 / 100: 94,90 % / 94,90 %; bei Einsatz 25: 95,86 %
     (Linien-Gewinne werden auf ganze Zahlen gerundet, bei Einsatz 25 wird jeder .5-Wert aufgerundet,
      darum liegt dieser Einsatz knapp über dem Rest. Bei Einsatz 10 ist nichts zu runden.)
   Simulation (95,13 %) und exakte Basis-Rechnung passen zusammen, alle Werte liegen im Zielkorridor
   94,5 bis 95,5 %. Die Serienlänge folgt einer geometrischen Reihe: Jedes Freispiel kann mit
   Wahrscheinlichkeit p (3+ Boote) weitere 10 bringen, im Schnitt also 10 / (1 - 10 x p) Freispiele
   (p = 0,0086 -> 10,94). Verteilung der Gesamtauszahlung einer ausgelösten Serie (20 Mio. Drehs,
   171.231 Serien, Einsatz-Vielfache): mittlere Hälfte 24,5- bis 51-fach, Median 35,7-fach,
   90 % unter 71-fach, 99 % unter 118-fach, Höchstwert dieses Laufs 286-fach.
   Weil 58 % der bezahlten Drehs gar nichts auszahlen und 44 % der Treffer unter dem Einsatz bleiben,
   ist der Verlauf trotz der hohen Trefferquote für den Spieler im Schnitt negativ (Hausvorteil 4,9 %).

   SPANNUNG, KNAPP DANEBEN UND TON (Anzeige und Klang, nie das Ergebnis)
   Wie echte Automaten arbeitet das Spiel mit Spannung (Anticipation), Beinahe-Treffern und Ton:
   Liegen nach den ersten Walzen schon 2 Boote, drehen die übrigen Walzen 0,8 bis 1,5 Sekunden
   länger (steigend) und bremsen langsamer aus, die Boote pulsieren golden, der Spannungs-Ton läuft.
   Genau 2 Boote am Ende oder 4 gleiche hohe Symbole mit dem fünften direkt daneben ergeben ein
   "So knapp!". Jeder Liniengewinn feiert mit Lichtlauf und Mini-Jingle, auch unter dem Einsatz.
   GRENZE: Alles wird NUR aus dem längst feststehenden Ergebnis gelesen (spannungErmitteln,
   fastGewinnErmitteln). ECHTE AUTOMATEN manipulieren hier: Sie stoppen Scatter auffällig oft knapp
   über oder unter dem Fenster und gewichten ihre Walzen virtuell so, dass das dritte Symbol seltener
   fällt, als es aussieht. Das tun wir bewusst NICHT. Und die Netto-Anzeige bleibt ehrlich:
   Sie nennt immer Auszahlung minus Einsatz, auch bei einem Gewinn unter dem Einsatz.
   ============================================================ */

import { bewegungReduziert, toplisteAnzeigen, stillEintragen } from "../assets/ui.js";
import { gewinnFeiern, stufeBestimmen, STUFEN } from "../assets/gewinnfeier.js";
import {
  tonKnopf, klangSpinStart, klangWalzenStopp, klangSpannung, klangFastGewinn, klangGewinn, klangMuenzTick,
} from "../assets/klang.js";
import { linienAnzeigeBauen, linienFarbe } from "../assets/gewinnlinien.js";
import { lade, speichere, entferne } from "../assets/storage.js";
import {
  STARTGELD, kontostand, statistik, einsatzAbbuchen, rundeAbschliessen,
  istPleite, pleiteNeustart, walletHud, walletHudAktualisieren,
} from "../assets/wallet.js";

const SPIEL = "angelglueck";                    // Schlüssel für storage.js (Topliste, Einsatz, Freispiel-Stand)
const FS_SCHLUESSEL = "freispiele";             // darunter liegt der Zustand einer laufenden Freispiel-Serie

/* ============================================================
   TEIL 1: REINE SPIELLOGIK (ohne DOM)
   "export" steht nur da, damit Tests in Node die Funktionen
   importieren können. Im Browser wird es nicht gebraucht.
   ============================================================ */

/** Die wählbaren Gesamteinsätze (passend zu den Chip-Knöpfen in index.html). */
export const EINSATZSTUFEN = [10, 25, 50, 100];

/** Spielfeld: 5 Walzen (Spalten) mit je 3 sichtbaren Reihen. */
export const SPALTEN = 5;
export const ZEILEN = 3;

/** Ein Scatter-Auslöser (3+ Boote) gibt so viele Freispiele … */
export const FREISPIELE_PRO_AUSLOESUNG = 10;
/** … und zahlt sofort Gesamteinsatz mal diesen Faktor. */
export const SCATTER_FAKTOR = 2;
/** Mindestanzahl Scatter (irgendwo im Fenster) für Freispiele + Scatter-Auszahlung. */
export const SCATTER_MINDESTENS = 3;

/** Der Gewinn-Mindestwert (Netto), ab dem ein bezahlter Dreh in die Topliste kommt. */
export const MINDEST_NETTO_FUER_TOPLISTE = 100;

/** Symbol-IDs. Sie sind zugleich die Namen der SVG-Symbole (#sym-<id>) in index.html. */
export const MUSCHEL = "muschel";
export const SEESTERN = "seestern";
export const ANKER = "anker";
export const RETTUNGSRING = "rettungsring";
export const ANGELRUTE = "angelrute";
export const MOEWE = "moewe";
export const FISCH = "fisch";
export const BOOT = "boot";        // SCATTER: zählt überall im Fenster, nicht nur auf Linien
export const ANGLER = "angler";    // WILD: ersetzt alles außer dem Scatter (und sammelt in Freispielen)

/** Anzeigenamen der Symbole (für Screenreader und Meldungen). */
export const SYMBOL_NAMEN = {
  [MUSCHEL]: "Muschel",
  [SEESTERN]: "Seestern",
  [ANKER]: "Anker",
  [RETTUNGSRING]: "Rettungsring",
  [ANGELRUTE]: "Angelrute",
  [MOEWE]: "Möwe",
  [FISCH]: "Fisch",
  [BOOT]: "Fischerboot",
  [ANGLER]: "Angler",
};

/**
 * Die 10 festen Gewinnlinien. Jede Linie ist ein Array mit 5 Einträgen, einer
 * pro Walze (Spalte): der Eintrag sagt, in WELCHER REIHE die Linie auf dieser
 * Walze liegt (0 = oben, 1 = Mitte, 2 = unten).
 * Beispiel [0, 1, 2, 1, 0]: oben, Mitte, unten, Mitte, oben, also ein "V".
 * Gewertet wird immer von links (Walze 1) nach rechts.
 */
export const LINIEN = [
  [1, 1, 1, 1, 1],   // 1: mittlere Reihe
  [0, 0, 0, 0, 0],   // 2: obere Reihe
  [2, 2, 2, 2, 2],   // 3: untere Reihe
  [0, 1, 2, 1, 0],   // 4: "V"
  [2, 1, 0, 1, 2],   // 5: umgedrehtes "V"
  [0, 0, 1, 2, 2],   // 6: Treppe nach unten
  [2, 2, 1, 0, 0],   // 7: Treppe nach oben
  [1, 0, 0, 0, 1],   // 8: oben gewölbt
  [1, 2, 2, 2, 1],   // 9: unten gewölbt
  [2, 1, 1, 1, 2],   // 10: Mulde
];

/** Der Gesamteinsatz verteilt sich auf alle Linien: Linieneinsatz = Einsatz / LINIEN_ANZAHL (hier 10). */
export const LINIEN_ANZAHL = LINIEN.length;

/**
 * Quoten-Tabelle: Auszahlung einer Linie = Quote x Linieneinsatz (= Einsatz / 10).
 * Je Symbol drei Werte für 3 / 4 / 5 gleiche Symbole von links.
 * Der ANGLER (Wild) hat eine eigene Zeile: eine reine Angler-Kette zahlt so viel.
 * Der Scatter (Boot) steht hier NICHT drin, er zahlt nicht auf Linien.
 */
export const QUOTEN = {
  [MUSCHEL]: [5, 12, 40],
  [SEESTERN]: [5, 12, 40],
  [ANKER]: [5, 15, 50],
  [RETTUNGSRING]: [5, 15, 50],
  [ANGELRUTE]: [10, 30, 120],
  [MOEWE]: [10, 30, 120],
  [FISCH]: [20, 60, 250],
  [ANGLER]: [25, 100, 500],
};

/**
 * Mögliche Geldwerte eines Fisches in den Freispielen, als Faktor vom
 * GESAMTEINSATZ. "gewicht" ist die relative Häufigkeit: kleine Werte sind
 * häufig, große selten. "groesse" bestimmt nur, welches Fisch-Bild gezeigt wird.
 */
export const FISCH_WERTE = [
  { faktor: 0.5, gewicht: 46, groesse: "klein" },
  { faktor: 1, gewicht: 28, groesse: "klein" },
  { faktor: 2, gewicht: 15, groesse: "mittel" },
  { faktor: 5, gewicht: 8, groesse: "gross" },
  { faktor: 10, gewicht: 3, groesse: "gross" },
];
const FISCH_GEWICHT_SUMME = FISCH_WERTE.reduce((summe, w) => summe + w.gewicht, 0);

/*
 * Kurznamen, damit die Walzenbänder unten lesbar bleiben.
 */
const MUS = MUSCHEL, SEE = SEESTERN, ANK = ANKER, RET = RETTUNGSRING, RUT = ANGELRUTE, MOE = MOEWE;
const FIS = FISCH, BOO = BOOT, ANG = ANGLER;

/**
 * Die fünf Walzenbänder des BASISSPIELS, je 30 Felder. Das Band ist RINGFÖRMIG
 * gedacht: nach dem letzten Feld kommt wieder das erste. Wie oft ein Symbol im
 * Array steht, bestimmt seine Wahrscheinlichkeit (jeder Stopp-Index ist gleich
 * wahrscheinlich).
 *
 * Zusammensetzung (auf ALLEN fünf Walzen gleich, nur die Reihenfolge ist anders):
 *            MUS SEE ANK RET RUT MOE FIS ANG BOO
 *   Walze 1-5:  6   5   4   4   3   3   2   2   1
 * Warum so? Mit den niedrigen Symbolen (Muschel, Seestern, Anker, Rettungsring = 19 von 30 Feldern)
 * fallen kleine Drei-Gleiche-Treffer häufig. Das hebt die Trefferquote, ohne dass seltene
 * Jackpots mehr zahlen müssen. (Früher hatten Walze 1 und 5 nur einen Fisch und einen Seestern mehr.)
 * Die Reihenfolge ist so gemischt, dass GLEICHE SYMBOLE NIE DIREKT NEBENEINANDER stehen (auch nicht
 * über den Ring-Umbruch). Genau EIN Boot pro Walze: Auf einer Walze ist so nie mehr als ein Boot
 * gleichzeitig sichtbar, und 3 Boote brauchen 3 verschiedene Walzen.
 */
export const BAENDER_BASIS = [
  [ANK, MUS, FIS, RET, ANG, SEE, MOE, SEE, MUS, RET, ANK, MUS, RUT, SEE, MOE, ANG, RUT, SEE, MUS, ANK, RET, MUS, FIS, ANK, MOE, BOO, MUS, RUT, RET, SEE],
  [BOO, MUS, SEE, MUS, RET, RUT, SEE, ANK, RET, ANK, ANG, RET, RUT, MUS, RUT, FIS, SEE, ANK, SEE, ANG, MUS, RET, MOE, SEE, FIS, ANK, MOE, MUS, MOE, MUS],
  [FIS, BOO, SEE, RET, FIS, RUT, MUS, RET, MOE, MUS, ANG, MUS, ANK, RET, ANG, MOE, SEE, ANK, SEE, RUT, MOE, RET, MUS, ANK, MUS, SEE, MUS, ANK, RUT, SEE],
  [MOE, SEE, MOE, SEE, MUS, ANK, FIS, SEE, RET, MOE, ANG, RUT, MUS, RUT, SEE, ANK, RET, MUS, ANG, MUS, BOO, MUS, ANK, SEE, RUT, RET, MUS, ANK, FIS, RET],
  [FIS, MUS, ANG, MUS, SEE, ANK, RET, ANK, RET, ANK, BOO, MUS, SEE, FIS, RUT, MUS, RET, MOE, ANG, SEE, RUT, ANK, MUS, RET, MOE, RUT, SEE, MOE, SEE, MUS],
];

/**
 * Die Walzenbänder der FREISPIELE: gleiche Grundidee, aber leicht verschoben.
 * Das Sammel-Feature braucht Fische UND Angler gleichzeitig im Fenster, darum:
 *   - Walze 1 trägt viele Fische (8 statt 2), Walzen 2-4 jeweils 5 statt 2
 *     (nur kleine Symbole müssen dafür weichen),
 *   - Walze 5 trägt mehr Angler (3 statt 2) und weniger Fische (4 statt 8 wie auf Walze 1).
 *   - Die Angler auf Walze 1-4 sind je 1 (statt 2) – so sammelt nicht jeder
 *     zweite Dreh, aber wenn ein Angler kommt, liegen meist mehrere Fische da.
 * Zusammensetzung:
 *            MUS SEE ANK RET RUT MOE FIS ANG BOO
 *   Walze 1:   5   4   3   3   3   2   8   1   1
 *   Walze 2-4: 5   5   4   4   3   2   5   1   1
 *   Walze 5:   5   5   4   4   2   2   4   3   1
 */
export const BAENDER_FREISPIEL = [
  [SEE, RUT, MUS, FIS, MUS, RET, RET, FIS, RUT, BOO, SEE, MOE, ANG, MUS, ANK, RUT, RET, ANK, FIS, MOE, FIS, FIS, SEE, MUS, MUS, FIS, FIS, ANK, FIS, SEE],
  [RET, ANK, MUS, SEE, MOE, SEE, ANK, FIS, SEE, RET, MUS, RUT, SEE, FIS, MUS, SEE, FIS, RUT, MUS, ANK, ANG, RET, ANK, BOO, MOE, RET, MUS, RUT, FIS, FIS],
  [MOE, MUS, FIS, ANG, ANK, MUS, RUT, RET, SEE, RUT, RUT, SEE, FIS, SEE, MUS, MUS, RET, MOE, ANK, FIS, RET, MUS, BOO, FIS, FIS, ANK, SEE, SEE, ANK, RET],
  [FIS, SEE, RET, FIS, RET, MOE, SEE, FIS, RET, ANG, FIS, RUT, MUS, RUT, SEE, ANK, BOO, ANK, RUT, SEE, MUS, RET, MUS, MUS, FIS, SEE, ANK, MUS, ANK, MOE],
  [SEE, MUS, ANK, MUS, FIS, RET, BOO, MOE, MUS, MOE, ANG, SEE, ANG, FIS, RET, ANG, FIS, RUT, MUS, ANK, SEE, ANK, RET, ANK, SEE, MUS, SEE, FIS, RET, RUT],
];

/* ------------------------------------------------------------
   Fenster, Linien, Scatter
   ------------------------------------------------------------ */

/**
 * Das sichtbare Fenster für gegebene Stopp-Indizes: fenster[spalte][zeile].
 * Das Band ist RINGFÖRMIG: Steht eine Walze auf Index 5, liegt dieses Symbol
 * in der MITTLEREN Reihe, Index 4 sieht man oben und Index 6 unten.
 * Das "+ n) % n" fängt negative Indizes ab (vor Index 0 kommt das Bandende).
 */
export function fensterAusStopps(stopps, baender) {
  return baender.map((band, spalte) => {
    const n = band.length;
    return [0, 1, 2].map((zeile) => band[(stopps[spalte] + zeile - 1 + n) % n]);
  });
}

/**
 * Würfelt für jede Walze einen Stopp-Index (0 … Bandlänge-1), alle gleich
 * wahrscheinlich. `zufall` ist austauschbar (Standard Math.random), so lassen
 * sich in Tests gezielt Ergebnisse "vorbereiten".
 *
 * WARUM Math.random()? Kryptografischer Zufall schützt davor, dass jemand
 * Ergebnisse VORHERSAGT, um echtes Geld zu gewinnen. Hier gibt es nur
 * Spielgeld, also wäre das Overkill.
 */
export function zufallsStopps(baender, zufall = Math.random) {
  return baender.map((band) => Math.floor(zufall() * band.length));
}

/**
 * Wertet EINE Linie aus. `symbole` = die 5 Symbole der Linie von links nach rechts.
 * Rückgabe: { symbol, anzahl, quote } oder null (kein Gewinn).
 *
 * Regeln:
 *  - Gewertet wird von links, mindestens 3 gleiche Symbole nebeneinander.
 *  - Der ANGLER (Wild) ersetzt jedes Symbol außer dem Boot (Scatter).
 *  - Das Boot zahlt nie auf der Linie und unterbricht jede Kette.
 *  - Beginnt die Linie mit Anglern, kann die Kette zwei Dinge sein: eine reine
 *    Angler-Kette ODER die Kette des ersten "echten" Symbols (die Angler
 *    helfen mit). Wir nehmen die bessere der beiden Möglichkeiten.
 */
export function linieAuswerten(symbole) {
  // 1. Wie viele Angler stehen ganz links am Stück?
  let anglerLaenge = 0;
  while (anglerLaenge < SPALTEN && symbole[anglerLaenge] === ANGLER) anglerLaenge++;

  let beste = null;

  // Möglichkeit A: reine Angler-Kette (nur ab 3 Stück)
  if (anglerLaenge >= 3) {
    beste = { symbol: ANGLER, anzahl: anglerLaenge, quote: QUOTEN[ANGLER][anglerLaenge - 3] };
  }

  // Möglichkeit B: das erste Nicht-Angler-Symbol bestimmt die Kette
  if (anglerLaenge < SPALTEN) {
    const ziel = symbole[anglerLaenge];
    if (ziel !== BOOT) {
      let anzahl = anglerLaenge;
      while (anzahl < SPALTEN && (symbole[anzahl] === ziel || symbole[anzahl] === ANGLER)) anzahl++;
      if (anzahl >= 3) {
        const quote = QUOTEN[ziel][anzahl - 3];
        if (!beste || quote > beste.quote) beste = { symbol: ziel, anzahl, quote };
      }
    }
  }
  return beste;
}

/** Linien-Gewinn in Geld: Quote x Einsatz / 10, auf ganze Zahlen gerundet. */
export function linienBetrag(quote, einsatz) {
  return Math.round((quote * einsatz) / LINIEN_ANZAHL);
}

/**
 * Wertet alle 10 Linien aus. Rückgabe:
 *   gewinne  Liste { linie, symbol, anzahl, quote, betrag, zellen }
 *            "zellen" = die gewinnenden Felder als [spalte, zeile]
 *   summe    Gesamtbetrag aller Linien
 */
export function linienAuswerten(fenster, einsatz) {
  const gewinne = [];
  let summe = 0;
  LINIEN.forEach((reihen, linienNr) => {
    const symbole = reihen.map((zeile, spalte) => fenster[spalte][zeile]);
    const treffer = linieAuswerten(symbole);
    if (!treffer) return;
    const betrag = linienBetrag(treffer.quote, einsatz);
    const zellen = [];
    for (let spalte = 0; spalte < treffer.anzahl; spalte++) zellen.push([spalte, reihen[spalte]]);
    gewinne.push({ linie: linienNr, symbol: treffer.symbol, anzahl: treffer.anzahl, quote: treffer.quote, betrag, zellen });
    summe += betrag;
  });
  return { gewinne, summe };
}

/**
 * Zählt die Scatter (Boote) im ganzen Fenster, egal wo. Ab 3 Stück:
 * Gesamteinsatz x 2 und 10 Freispiele.
 */
export function scatterAuswerten(fenster, einsatz) {
  const zellen = [];
  fenster.forEach((spalte, s) => spalte.forEach((symbol, z) => { if (symbol === BOOT) zellen.push([s, z]); }));
  const ausgeloest = zellen.length >= SCATTER_MINDESTENS;
  return {
    anzahl: zellen.length,
    zellen,
    betrag: ausgeloest ? SCATTER_FAKTOR * einsatz : 0,
    freispiele: ausgeloest ? FREISPIELE_PRO_AUSLOESUNG : 0,
  };
}

/* ------------------------------------------------------------
   Spannung und "knapp daneben" (nur Anzeige, nie das Ergebnis)
   ------------------------------------------------------------ */

/** So viele Boote müssen nach den ersten Walzen schon liegen, damit die übrigen Walzen länger drehen. */
export const SPANNUNG_AB = 2;

/**
 * Bestimmt, ob und ab welcher Walze die Spannung ("Anticipation") läuft. `fenster` ist das fertige
 * Ergebnis (fenster[spalte][zeile]). Rückgabe { ab, scatter }:
 *   ab       Index der ersten Walze, die länger dreht (0-basiert), oder -1 (keine Spannung)
 *   scatter  die Boote, die zu diesem Zeitpunkt schon liegen, als [spalte, zeile]
 *
 * EHRLICHKEIT: Die Funktion LIEST nur das längst feststehende Ergebnis und verändert keinen Stopp.
 * Sind nach Walze 2, 3 oder 4 zwei Boote da, steigt die Spannung für ALLE übrigen Walzen, egal ob
 * später ein drittes Boot fällt. ECHTE AUTOMATEN gehen hier weiter und manipulieren: Sie lassen
 * Scatter auffällig oft "knapp" über oder unter dem Fenster stoppen und gewichten ihre Walzenbänder
 * virtuell so, dass das dritte Symbol seltener fällt, als es aussieht. Das tun wir bewusst NICHT:
 * Jede Walze stoppt auf einem gleichverteilt gewürfelten Index, auch wenn die Spannung läuft.
 */
export function spannungErmitteln(fenster) {
  const scatter = [];
  for (let spalte = 0; spalte < SPALTEN - 1; spalte++) {
    fenster[spalte].forEach((symbol, zeile) => { if (symbol === BOOT) scatter.push([spalte, zeile]); });
    if (scatter.length >= SPANNUNG_AB) return { ab: spalte + 1, scatter };
  }
  return { ab: -1, scatter: [] };
}

/** Die "hohen" Symbole: Ab hier lohnt es sich, einen Beinahe-Treffer zu zeigen (5 gleiche zahlen mindestens das 120-Fache). */
export const HOHE_SYMBOLE = [ANGELRUTE, MOEWE, FISCH, ANGLER];

/**
 * "Knapp daneben" (Near Miss): ein ECHTER Beinahe-Gewinn, der sich ohne jede Nachhilfe ergibt.
 *   a) GENAU 2 Boote liegen im Fenster, das dritte fehlt (die Freispiele sind knapp verpasst).
 *   b) Eine Linie zeigt 4 gleiche HOHE Symbole (Angler als Wild zählen mit), und das fünfte steht
 *      sichtbar daneben: in der letzten Walze, aber in einer anderen Reihe als die Linie.
 * Rückgabe: null oder { art: "scatter" | "linie", symbol, zellen } mit den Feldern, die wackeln
 * sollen ([spalte, zeile]). Fall a) hat Vorrang.
 *
 * EHRLICHKEIT: Auch hier wird nur gelesen. ECHTE AUTOMATEN stellen solche Beinahe-Treffer gezielt
 * und weit häufiger her, als der Zufall sie liefert. Wir zeigen nur, was zufällig vorkommt.
 * "Genau 2 Boote" ist bei diesen Bändern etwa jeder 14. Dreh (7,3 %).
 */
export function fastGewinnErmitteln(fenster, linien, scatter) {
  if (scatter.anzahl === 2) return { art: "scatter", symbol: BOOT, zellen: scatter.zellen };
  const kandidaten = linien.gewinne
    .filter((g) => g.anzahl === 4 && HOHE_SYMBOLE.includes(g.symbol))
    .sort((a, b) => b.quote - a.quote);
  const letzte = SPALTEN - 1;
  for (const g of kandidaten) {
    const zellen = [];
    for (let zeile = 0; zeile < ZEILEN; zeile++) {
      const symbol = fenster[letzte][zeile];
      if (zeile !== LINIEN[g.linie][letzte] && (symbol === g.symbol || symbol === ANGLER)) zellen.push([letzte, zeile]);
    }
    if (zellen.length > 0) return { art: "linie", symbol: g.symbol, zellen };
  }
  return null;
}

/* ------------------------------------------------------------
   Das Sammel-Feature (nur in Freispielen)
   ------------------------------------------------------------ */

/** Würfelt EINEN Fisch-Wert (gewichtet). Liefert den Eintrag aus FISCH_WERTE. */
export function fischWertWuerfeln(zufall = Math.random) {
  let rest = zufall() * FISCH_GEWICHT_SUMME;
  for (const wert of FISCH_WERTE) {
    if (rest < wert.gewicht) return wert;
    rest -= wert.gewicht;
  }
  return FISCH_WERTE[FISCH_WERTE.length - 1];     // Sicherheitsnetz gegen Rundungsfehler
}

/** Geldwert eines Fisches: Faktor x Gesamteinsatz, gerundet (0,5 x 25 = 12,5 -> 13). */
export function fischBetrag(faktor, einsatz) {
  return Math.round(faktor * einsatz);
}

/**
 * Würfelt für jedes sichtbare FISCH-Symbol einen Geldwert.
 * Rückgabe: Liste { spalte, zeile, faktor, groesse, betrag }, geordnet von
 * links nach rechts, oben nach unten.
 */
export function fischeWuerfeln(fenster, einsatz, zufall = Math.random) {
  const fische = [];
  fenster.forEach((spalte, s) => spalte.forEach((symbol, z) => {
    if (symbol !== FISCH) return;
    const wert = fischWertWuerfeln(zufall);
    fische.push({ spalte: s, zeile: z, faktor: wert.faktor, groesse: wert.groesse, betrag: fischBetrag(wert.faktor, einsatz) });
  }));
  return fische;
}

/**
 * Das Herzstück: Der ANGLER sammelt die Geldwerte ALLER sichtbaren Fische ein.
 *  - Kein Angler sichtbar: es wird nichts gesammelt (die Fische liegen nur
 *    da, ihre Werte verfallen).
 *  - Ein Angler: er sammelt alle Fische einmal ein.
 *  - Zwei oder mehr Angler: JEDER sammelt alle Fische ein, die Fische werden
 *    also mehrfach bezahlt (2 Angler = doppelte Summe).
 * Rückgabe: { angler, fische, einsammlungen, betrag }
 *   einsammlungen  pro Angler { angler, summe }  (für die Animation)
 *   betrag         Gesamtsumme aller Einsammlungen
 */
export function fischeSammeln(fenster, fische) {
  const angler = [];
  fenster.forEach((spalte, s) => spalte.forEach((symbol, z) => { if (symbol === ANGLER) angler.push({ spalte: s, zeile: z }); }));
  const fischSumme = fische.reduce((summe, f) => summe + f.betrag, 0);
  const einsammlungen = fische.length > 0 ? angler.map((a) => ({ angler: a, summe: fischSumme })) : [];
  return { angler, fische, einsammlungen, betrag: einsammlungen.reduce((summe, e) => summe + e.summe, 0) };
}

/* ------------------------------------------------------------
   Ein kompletter Dreh
   ------------------------------------------------------------ */

/**
 * Würfelt UND wertet einen einzelnen Dreh aus (Basisspiel oder Freispiel).
 *   baender       die 5 Walzenbänder (Basis- oder Freispiel-Bänder)
 *   mitSammeln    true in Freispielen: Fische tragen Geldwerte, Angler sammeln
 * Rückgabe: { stopps, fenster, linien, scatter, sammeln, gesamt }
 * "gesamt" = Linien + Scatter + gesammelte Fischwerte (Brutto-Auszahlung).
 * `stopps` kann übergeben werden (Tests, präparierter Zufall), sonst wird gewürfelt.
 */
export function drehAuswerten(baender, einsatz, mitSammeln, zufall = Math.random, stopps = null) {
  const gestoppt = stopps ?? zufallsStopps(baender, zufall);
  const fenster = fensterAusStopps(gestoppt, baender);
  const linien = linienAuswerten(fenster, einsatz);
  const scatter = scatterAuswerten(fenster, einsatz);
  const sammeln = mitSammeln ? fischeSammeln(fenster, fischeWuerfeln(fenster, einsatz, zufall)) : null;
  const gesamt = linien.summe + scatter.betrag + (sammeln ? sammeln.betrag : 0);
  return { stopps: gestoppt, fenster, linien, scatter, sammeln, gesamt };
}

/* ------------------------------------------------------------
   Freispiel-Zustand (rein rechnerisch, damit er auch gespeichert
   und später fortgesetzt werden kann)
   ------------------------------------------------------------ */

/**
 * Startzustand einer Freispiel-Serie.
 *   rest      noch offene Freispiele
 *   einsatz   der Gesamteinsatz des bezahlten Drehs (gilt für alle Freispiele)
 *   summe     bisherige BRUTTO-Auszahlung des ganzen bezahlten Drehs
 *             (Basis-Dreh inklusive Scatter-Gewinn, danach alle Freispiele)
 *   gespielt  wie viele Freispiele schon gespielt wurden
 */
export function freispielStarten(einsatz, basisAuszahlung) {
  return { rest: FREISPIELE_PRO_AUSLOESUNG, einsatz, summe: basisAuszahlung, gespielt: 0 };
}

/**
 * Verbucht EIN Freispiel: ein Freispiel verbraucht, Gewinn addiert und bei
 * erneut 3+ Scatter 10 weitere Freispiele dazu. Liefert einen NEUEN Zustand
 * (das alte Objekt bleibt unverändert, das macht Fehler seltener).
 */
export function freispielVerbuchen(zustand, ergebnis) {
  return {
    rest: zustand.rest - 1 + ergebnis.scatter.freispiele,
    einsatz: zustand.einsatz,
    summe: zustand.summe + ergebnis.gesamt,
    gespielt: zustand.gespielt + 1,
  };
}

/**
 * Ein kompletter bezahlter Dreh samt aller Freispiele, ohne Animation.
 * Genau diese Funktion nutzt die Simulation unten für die RTP-Rechnung.
 * Rückgabe: { auszahlung, basis, freispielAuszahlung, freispiele }
 *   basis                Auszahlung des bezahlten Drehs allein (Linien + Scatter)
 *   freispielAuszahlung  alles, was in den Freispielen dazukam
 *   freispiele           Anzahl gespielter Freispiele
 */
export function bezahltenDrehSimulieren(einsatz, zufall, baenderBasis, baenderFreispiel) {
  const start = drehAuswerten(baenderBasis, einsatz, false, zufall);
  let zustand = freispielStarten(einsatz, start.gesamt);
  if (start.scatter.freispiele === 0) {
    return { auszahlung: start.gesamt, basis: start.gesamt, freispielAuszahlung: 0, freispiele: 0 };
  }
  while (zustand.rest > 0) {
    zustand = freispielVerbuchen(zustand, drehAuswerten(baenderFreispiel, einsatz, true, zufall));
  }
  return { auszahlung: zustand.summe, basis: start.gesamt, freispielAuszahlung: zustand.summe - start.gesamt, freispiele: zustand.gespielt };
}

/* ------------------------------------------------------------
   Speicherung laufender Freispiele
   ------------------------------------------------------------
   Während einer Freispiel-Serie liegt der Zustand (rest, einsatz, summe,
   gespielt) im localStorage unter ba:angelglueck:freispiele. Beim nächsten
   Seitenaufruf liest das Spiel ihn wieder ein und macht weiter. Weil
   localStorage von außen veränderbar ist (Entwicklerwerkzeuge, alte
   Versionen …), wird der gelesene Wert STRENG geprüft, bevor er benutzt wird. */

/**
 * Prüft einen aus dem Speicher gelesenen Wert und gibt einen sauberen
 * Freispiel-Zustand zurück, oder null, wenn irgendetwas nicht stimmt.
 */
export function freispielZustandPruefen(roh) {
  if (!roh || typeof roh !== "object") return null;
  const { rest, einsatz, summe, gespielt } = roh;
  const ganz = (x, max) => Number.isInteger(x) && x >= 0 && x <= max;
  if (!ganz(rest, 10000) || !ganz(summe, 1e9) || !ganz(gespielt, 10000)) return null;
  if (!EINSATZSTUFEN.includes(einsatz)) return null;
  return { rest, einsatz, summe, gespielt };
}

/* ------------------------------------------------------------
   Animationsplanung (auch rein rechnerisch, ohne DOM)
   ------------------------------------------------------------
   Eine Walze "rollt" mit konstantem Tempo und bremst am Ende mit
   easeOutBack ab, das kurz übers Ziel hinausschwingt und zurückfedert.
   Positionen werden in FELDERN gerechnet (1.0 = ein Symbol weiter).

   Das Besondere: Jede Walze hat eine FESTE Stoppzeit (links früher als
   rechts). Weil das Band nur nach ganzen Bandlängen wieder gleich aussieht,
   muss der Gesamtweg ein Rest plus ein Vielfaches von 30 sein. Statt die
   Zeit passend zu stauchen, wird das TEMPO angepasst: Gesamtweg = Tempo x
   (Laufzeit + Bremsanteil). Der Bremsweg ergibt sich aus dem Tempo, damit
   der Übergang von "rollen" zu "bremsen" ohne Ruck klappt. */

const BREMS_ZEIT = 0.5;      // Sekunden für die Bremsphase
const BOUNCE = 1.3;          // Stärke des Überschwingens (0 = gar nicht, 1,7 = deutlich)
const MIN_TEMPO = 22;        // so schnell (Felder pro Sekunde) rollt jede Walze mindestens
/* Die Ableitung von easeOutBack bei x=0 ist BOUNCE+3: Wer den Bremsweg
   so wählt, dass Anfangsgeschwindigkeit = Rolltempo, bremst ohne Ruck. */
const BREMS_FAKTOR = BREMS_ZEIT / (BOUNCE + 3);

/* ---- Spannung ("Anticipation") ----
   Liegen nach den ersten Walzen schon SPANNUNG_AB Boote im Fenster, drehen die VERBLEIBENDEN Walzen
   länger und bremsen langsamer aus: Jede betroffene Walze wartet SPANNUNG_EXTRA Sekunden länger als
   normal (1., 2., 3. betroffene Walze: steigend), und ihre Bremsphase dauert doppelt so lang. */
const SPANNUNG_EXTRA = [0.8, 1.15, 1.5];      // Zusatz-Sekunden je betroffener Walze (steigend)
const BREMS_ZEIT_SPANNUNG = 1.0;              // langsames Ausdrehen

/** easeOutBack: läuft von 0 nach 1, überschwingt kurz über 1 und federt zurück. */
function easeOutBack(x) {
  const c = BOUNCE + 1;
  return 1 + c * Math.pow(x - 1, 3) + BOUNCE * Math.pow(x - 1, 2);
}

/**
 * Plant den Lauf aller Walzen. `start` und `ziel` sind Stopp-Indizes,
 * `laengen` die Bandlängen. Für jede Walze:
 *   strecke   Gesamtweg in Feldern (Rest bis zum Ziel + ganze Bandlängen)
 *   tempo     Felder pro Sekunde in der Rollphase
 *   laufzeit  Sekunden Rollen, danach beginnt die Bremsphase
 *   bremsZeit Dauer der Bremsphase (normal 0,5 s, bei Spannung 1,0 s)
 *   ende      Sekunde, in der die Walze ruht (= laufzeit + bremsZeit)
 *   spannung  true, wenn die Walze zu den länger drehenden gehört
 *   spannungStart  Sekunde, in der die Spannung für diese Walze beginnt (= Stopp der Walze davor), sonst null
 * `ersteStoppZeit` und `abstand` bestimmen, wann die erste Walze bremst
 * und wie viel später jede weitere folgt: Sie stoppen also garantiert
 * von links nach rechts. Ab `spannungAb` (siehe spannungErmitteln, -1 = nie) kommt für jede
 * Walze der Spannungs-Zuschlag dazu.
 */
export function laufPlanErstellen(start, ziel, laengen, ersteStoppZeit = 0.45, abstand = 0.2, spannungAb = -1) {
  let vorherEnde = 0;
  return ziel.map((z, i) => {
    const n = laengen[i];
    const rest = (((start[i] - z) % n) + n) % n;               // Rest-Strecke bis zum Ziel (immer 0 … n-1)
    const spannung = spannungAb >= 0 && i >= spannungAb;
    const bremsZeit = spannung ? BREMS_ZEIT_SPANNUNG : BREMS_ZEIT;
    const bremsFaktor = bremsZeit / (BOUNCE + 3);
    const ende = spannung
      ? vorherEnde + abstand + SPANNUNG_EXTRA[Math.min(i - spannungAb, SPANNUNG_EXTRA.length - 1)]
      : ersteStoppZeit + i * abstand + BREMS_ZEIT;
    const laufzeit = ende - bremsZeit;
    const teiler = laufzeit + bremsFaktor;                     // strecke = tempo x teiler
    let strecke = rest;
    while (strecke / teiler < MIN_TEMPO) strecke += n;         // so viele ganze Runden, bis das Tempo reicht
    const tempo = strecke / teiler;
    const plan = {
      start: start[i], strecke, tempo, laufzeit, bremsZeit, bremsWeg: tempo * bremsFaktor, ende: laufzeit + bremsZeit,
      spannung, spannungStart: spannung ? vorherEnde : null,
    };
    vorherEnde = plan.ende;
    return plan;
  });
}

/** Zurückgelegte Strecke (in Feldern) einer Walze zum Zeitpunkt t (Sekunden seit Start). */
export function vorschubZurZeit(plan, t) {
  if (t <= plan.laufzeit) return plan.tempo * Math.max(t, 0);                      // Phase 1: gleichmäßig rollen
  const x = Math.min((t - plan.laufzeit) / plan.bremsZeit, 1);                     // Phase 2: Fortschritt 0 … 1
  return plan.tempo * plan.laufzeit + plan.bremsWeg * easeOutBack(x);
}

/** Zahl mit Tausenderpunkt: 1250 -> "1.250". */
function zahlText(n) {
  return n.toLocaleString("de-DE");
}

/** Faktor deutsch schreiben: 0.5 -> "0,5". */
export function faktorText(faktor) {
  return String(faktor).replace(".", ",");
}

/** Reihenfolge der Symbole in der Gewinntabelle (wertvollstes zuerst). */
export const TABELLEN_REIHENFOLGE = [ANGLER, FISCH, ANGELRUTE, MOEWE, ANKER, RETTUNGSRING, MUSCHEL, SEESTERN];

/* Die Farben der Gewinnlinien (je Linie eine feste Farbe) stehen in assets/gewinnlinien.js (linienFarbe):
   Tabs, Vorschau, Gewinn-Überlagerung und die Bilder der Anleitung benutzen dieselbe Palette. */

/* ============================================================
   TEIL 3: DOM-HELFER
   ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Baut ein Symbol als <svg><use href="#sym-…"/></svg>. Die eigentliche Zeichnung
 * liegt einmal als <symbol> im Sprite in index.html; hier wird sie nur
 * "eingesetzt". SVG-Elemente brauchen createElementNS (mit Namensraum),
 * normales createElement würde sie nicht als Grafik erkennen.
 * Der Fisch gibt es in drei Größen; ohne Angabe zeigt er die mittlere.
 */
function symbolElement(id, groesse = "mittel") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", id === FISCH ? `#sym-fisch-${groesse}` : `#sym-${id}`);
  svg.append(use);
  return svg;
}

/** Wartet `ms` Millisekunden – als Promise, damit man "await warte(…)" schreiben kann. */
function warte(ms) {
  return new Promise((fertig) => setTimeout(fertig, ms));
}

/**
 * Spielt einen Klang aus klang.js, aber erst NACH der ersten Nutzer-Geste (Klick, Tippen, Taste).
 * Browser erlauben Ton vorher nicht ("Autoplay-Policy"); ohne diese Prüfung würde eine automatisch
 * fortgesetzte Freispiel-Serie (nach dem Neuladen) eine Konsolen-Warnung erzeugen.
 */
function klang(funktion, ...argumente) {
  if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  funktion(...argumente);
}

/**
 * Münz-Ticks während der Betrag in der Gewinnfeier hochzählt. Bewusst GEDROSSELT: Zwischen zwei
 * Ticks liegen anfangs 55 ms, am Ende 140 ms (der Zähler läuft ja zum Schluss langsamer aus).
 * Rückgabe: Funktion, die die Ticks sofort beendet (wenn die Feier endet oder übersprungen wird).
 * Bei "Bewegung reduzieren" gibt es keinen hochzählenden Betrag und damit auch keine Ticks.
 */
function muenzTicksStarten(dauerMs) {
  if (bewegungReduziert()) return () => {};
  const start = performance.now();
  let timer = 0;
  const tick = () => {
    const t = (performance.now() - start) / dauerMs;
    if (t >= 1) return;
    klang(klangMuenzTick);
    timer = setTimeout(tick, 55 + 85 * t * t);
  };
  tick();
  return () => clearTimeout(timer);
}

/** Startet eine CSS-Animation (über eine Klasse) garantiert NEU (Klasse weg, Reflow, Klasse dran). */
function animationNeuStarten(element, klasse) {
  element.classList.remove(klasse);
  void element.offsetWidth;
  element.classList.add(klasse);
}

/** Ein kleines Bild einer Gewinnlinie (Raster 5x3 mit der Linie als Linienzug). Zeichnet aus LINIEN. */
function linienBildBauen(reihen, nummer) {
  const halter = document.createElement("div");
  halter.className = "linien-bild";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 5 3");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Linie ${nummer}: Reihen ${reihen.map((r) => r + 1).join(", ")} (von oben gezählt)`);
  for (let spalte = 0; spalte < SPALTEN; spalte++) {
    for (let zeile = 0; zeile < ZEILEN; zeile++) {
      const feld = document.createElementNS(SVG_NS, "rect");
      feld.setAttribute("class", "raster-feld");
      feld.setAttribute("x", String(spalte + 0.06));
      feld.setAttribute("y", String(zeile + 0.06));
      feld.setAttribute("width", "0.88");
      feld.setAttribute("height", "0.88");
      feld.setAttribute("rx", "0.12");
      svg.append(feld);
    }
  }
  const linie = document.createElementNS(SVG_NS, "polyline");
  linie.setAttribute("points", reihen.map((zeile, spalte) => `${spalte + 0.5},${zeile + 0.5}`).join(" "));
  linie.setAttribute("fill", "none");
  linie.setAttribute("stroke", linienFarbe(nummer - 1));
  linie.setAttribute("stroke-width", "0.2");
  linie.setAttribute("stroke-linecap", "round");
  linie.setAttribute("stroke-linejoin", "round");
  svg.append(linie);
  const beschriftung = document.createElement("span");
  beschriftung.textContent = `Linie ${nummer}`;
  halter.append(svg, beschriftung);
  return halter;
}

/* ============================================================
   TEIL 4: DAS SPIEL IM BROWSER
   ============================================================ */

function starteSpiel() {
  // ----- Elemente einmal suchen und merken -----
  const buehne = document.getElementById("buehne");
  const fsLeiste = document.getElementById("fs-leiste");
  const fsZaehler = document.getElementById("fs-zaehler");
  const fsGewinn = document.getElementById("fs-gewinn");
  const fensterElement = document.getElementById("fenster");
  const walzenElemente = [...fensterElement.querySelectorAll(".walze")];
  const overlay = document.getElementById("linien-overlay");
  // Nummern-Tabs links/rechts vom Fenster samt Linien-Vorschau (siehe assets/gewinnlinien.js)
  const linienAnzeige = linienAnzeigeBauen({
    linien: LINIEN,
    rahmen: document.getElementById("walzen-reihe"),
    tabsLinks: document.getElementById("tabs-links"),
    tabsRechts: document.getElementById("tabs-rechts"),
  });
  const gewinnAnzeige = document.getElementById("gewinn-anzeige");
  const drehInfo = document.getElementById("dreh-info");
  const hudLetzter = document.getElementById("hud-letzter");
  const drehKnopf = document.getElementById("dreh-knopf");
  const chipKnoepfe = [...document.querySelectorAll(".chip")];
  const tabelleKoerper = document.getElementById("gewinntabelle");
  const tabelleHinweis = document.getElementById("tabelle-hinweis");
  const sonderListe = document.getElementById("sonderliste");
  const fischwerteListe = document.getElementById("fischwerte");
  const linienBilder = document.getElementById("linien-bilder");
  const toplisteElement = document.getElementById("topliste");
  const resetKnopf = document.getElementById("reset");
  const kontoResetKnopf = document.getElementById("konto-reset");
  const kontoInfo = document.getElementById("konto-info");

  // Alle Bänder (Basis und Freispiel) sind gleich lang; die Länge steckt in einer Variable,
  // damit der Rest des Codes nirgends die Zahl 30 braucht.
  const laengen = BAENDER_BASIS.map((band) => band.length);

  // ----- Spielzustand -----
  let laeuft = false;                       // true, solange gedreht wird (auch in Freispielen): alles gesperrt
  let modus = "basis";                      // "basis" oder "freispiel": bestimmt Bänder und Bühnen-Optik
  let aktuelleBaender = BAENDER_BASIS;      // die Bänder, die gerade im DOM stehen
  let stopps = zufallsStopps(BAENDER_BASIS);// aktuelle Stopp-Indizes (Startbild: zufällig, kein Einfluss aufs Geld)
  let offeneRunde = null;                   // { einsatz, auszahlung, abgerechnet } während eines bezahlten Drehs
  let fsZustand = null;                     // Freispiel-Zustand (auch im localStorage), null = keine Serie
  let angezeigteSumme = 0;                  // Brutto-Auszahlung der laufenden Runde, wie sie gerade angezeigt wird
  let hoechsteStufe = 0;                    // höchste Feier-Stufe (0 bis 3), die in dieser Runde schon gezeigt wurde (siehe freispieleAbspielen)
  let fischZellen = [];                     // Zellen mit Fisch-Plakette (zum Aufräumen)
  const gespeicherterEinsatz = lade(SPIEL, "einsatz", EINSATZSTUFEN[0]);
  let gewaehlterEinsatz = EINSATZSTUFEN.includes(gespeicherterEinsatz) ? gespeicherterEinsatz : EINSATZSTUFEN[0];

  // ---------------------------------------------------------
  // Walzen aufbauen und positionieren
  // ---------------------------------------------------------

  /**
   * Füllt jedes Band mit den Symbolen des aktuellen Band-Satzes. Das Walzenband
   * steht DREIMAL hintereinander im DOM (Kopie 0, 1, 2). So kann die sichtbare
   * Position in der mittleren Kopie wandern und nach oben/unten "überlaufen",
   * ohne dass man eine Lücke sieht. Insgesamt 3 x 30 = 90 Felder je Walze.
   */
  function baenderAufbauen() {
    walzenElemente.forEach((walze, i) => {
      const band = walze.querySelector(".band");
      band.replaceChildren();
      for (let kopie = 0; kopie < 3; kopie++) {
        for (const symbolId of aktuelleBaender[i]) {
          const zelle = document.createElement("div");
          zelle.className = "zelle";
          zelle.append(symbolElement(symbolId));
          band.append(zelle);
        }
      }
    });
    fischZellen = [];
  }

  /**
   * Setzt die Position einer Walze. `position` ist der (auch gebrochene)
   * Index des Symbols in der MITTLEREN Reihe. Beispiel: 5.0 = Index 5 genau in
   * der Mitte, 5.5 = halb zwischen Index 5 und 6.
   *
   * Rechnung: Die mittlere Kopie des Bandes beginnt bei Feld n. Das OBERE
   * sichtbare Feld ist eins vor der Mitte: n + position - 1. Verschoben wird
   * das Band um genau so viele Felder nach oben. translateY in PROZENT bezieht
   * sich auf die Höhe des Bandes selbst (3n Felder), also: Verschiebung / (3n).
   * Das "% n" holt die Position in den Bereich 0 … n zurück (der Doppel-Modulo
   * ist der Trick, damit auch negative Zahlen sauber umbrechen).
   */
  function positionSetzen(walzenNr, position) {
    const n = laengen[walzenNr];
    const m = ((position % n) + n) % n;
    const prozent = ((m + n - 1) / (3 * n)) * 100;
    walzenElemente[walzenNr].querySelector(".band").style.transform = `translate3d(0, ${-prozent}%, 0)`;
  }

  function alleWalzenSetzen() {
    stopps.forEach((s, i) => positionSetzen(i, s));
    fensterBeschriften();
  }

  /** Das DOM-Feld (Zelle) in Spalte/Zeile für gegebene Stopp-Indizes (mittlere Kopie des Bandes). */
  function zelleFuer(spalte, zeile, stoppWerte) {
    const band = walzenElemente[spalte].querySelector(".band");
    return band.children[laengen[spalte] + stoppWerte[spalte] + zeile - 1];
  }

  /** Screenreader-Beschriftung des Fensters: nennt die Symbole jeder Walze von oben nach unten. */
  function fensterBeschriften() {
    const fenster = fensterAusStopps(stopps, aktuelleBaender);
    const text = fenster.map((spalte, i) => `Walze ${i + 1}: ${spalte.map((id) => SYMBOL_NAMEN[id]).join(", ")}`).join(". ");
    fensterElement.setAttribute("aria-label", text);
  }

  // ---------------------------------------------------------
  // Modus: Basisspiel oder Freispiele (Bänder + Unterwasser-Bühne)
  // ---------------------------------------------------------

  /** Legt ein paar Luftblasen an (reine Deko, nur ohne "Bewegung reduzieren"). */
  function blasenAnlegen() {
    if (bewegungReduziert()) return;
    for (let i = 0; i < 8; i++) {
      const blase = document.createElement("span");
      blase.className = "blase";
      blase.style.left = `${6 + i * 12}%`;
      blase.style.animationDelay = `${i * 0.9}s`;
      blase.style.animationDuration = `${6 + (i % 3)}s`;
      fensterElement.append(blase);
    }
  }

  function blasenEntfernen() {
    fensterElement.querySelectorAll(".blase").forEach((b) => b.remove());
  }

  function modusSetzen(neu) {
    if (modus === neu) return;
    modus = neu;
    aktuelleBaender = neu === "freispiel" ? BAENDER_FREISPIEL : BAENDER_BASIS;
    baenderAufbauen();
    alleWalzenSetzen();
    buehne.classList.toggle("unterwasser", neu === "freispiel");
    fsLeiste.hidden = neu !== "freispiel";
    if (neu === "freispiel") blasenAnlegen(); else blasenEntfernen();
  }

  function fsZaehlerAnzeigen(nummer, gesamt) {
    fsZaehler.textContent = `${nummer} / ${gesamt}`;
  }

  function summeAnzeigen(wert) {
    angezeigteSumme = wert;
    fsGewinn.textContent = `Gewinn ${zahlText(wert)}`;
  }

  // ---------------------------------------------------------
  // Einsatz und Chips
  // ---------------------------------------------------------

  /**
   * Der Einsatz, der wirklich gespielt wird: der gewählte, solange das Konto
   * reicht. Sonst der größte Chip, den man sich noch leisten kann (0 = pleite).
   * Der GEWÄHLTE Wert bleibt dabei unverändert gespeichert; nach einem Gewinn
   * ist er also wieder da.
   */
  function wirksamerEinsatz() {
    if (offeneRunde) return offeneRunde.einsatz;       // mitten im Dreh gilt der bereits abgebuchte Einsatz
    const stand = kontostand();
    if (gewaehlterEinsatz <= stand) return gewaehlterEinsatz;
    const leistbar = EINSATZSTUFEN.filter((stufe) => stufe <= stand);
    return leistbar.length ? Math.max(...leistbar) : 0;
  }

  function steuerungAktualisieren() {
    const stand = kontostand();
    const wirksam = wirksamerEinsatz();
    chipKnoepfe.forEach((chip) => {
      const wert = Number(chip.dataset.einsatz);
      chip.setAttribute("aria-pressed", String(wert === wirksam));
      chip.disabled = laeuft || wert > stand;          // gesperrt beim Drehen oder wenn zu teuer
    });
    drehKnopf.disabled = laeuft || wirksam === 0;
    resetKnopf.disabled = laeuft;
    kontoResetKnopf.disabled = laeuft;
    tabelleBetraegeAktualisieren();
  }

  function einsatzWaehlen(wert) {
    if (laeuft || !EINSATZSTUFEN.includes(wert) || wert > kontostand()) return;
    gewaehlterEinsatz = wert;
    speichere(SPIEL, "einsatz", wert);
    steuerungAktualisieren();
  }

  // ---------------------------------------------------------
  // Gewinntabelle (wird aus QUOTEN gebaut: eine Quelle der Wahrheit)
  // ---------------------------------------------------------
  const betragElemente = [];      // { quote, element } für die Linien-Beträge
  const fischBetragElemente = []; // { faktor, element } für die Fisch-Werte
  let scatterBetragElement = null;

  function tabelleAufbauen() {
    for (const symbol of TABELLEN_REIHENFOLGE) {
      const tr = document.createElement("tr");
      tr.dataset.symbol = symbol;

      const erste = document.createElement("td");
      const zelleSymbol = document.createElement("span");
      zelleSymbol.className = "symbol-zelle";
      zelleSymbol.append(symbolElement(symbol));
      const name = document.createElement("span");
      name.className = "symbol-name";
      name.textContent = symbol === ANGLER ? "Angler (Wild)" : SYMBOL_NAMEN[symbol];
      zelleSymbol.append(name);
      erste.append(zelleSymbol);
      tr.append(erste);

      QUOTEN[symbol].forEach((quote) => {
        const td = document.createElement("td");
        const betrag = document.createElement("span");
        betrag.className = "betrag";
        const quoteText = document.createElement("span");
        quoteText.className = "quote";
        quoteText.textContent = `×${quote}`;
        td.append(betrag, quoteText);
        betragElemente.push({ quote, element: betrag });
        tr.append(td);
      });
      tabelleKoerper.append(tr);
    }

    // Sonderzeilen: Scatter und Wild erklären
    const boot = document.createElement("li");
    boot.append(symbolElement(BOOT));
    const bootText = document.createElement("span");
    const bootTitel = document.createElement("strong");
    bootTitel.textContent = "Fischerboot (Scatter): ";
    scatterBetragElement = document.createElement("span");
    bootText.append(bootTitel, `${SCATTER_MINDESTENS} oder mehr irgendwo im Fenster zahlen den doppelten Gesamteinsatz (`, scatterBetragElement, `) und starten ${FREISPIELE_PRO_AUSLOESUNG} Freispiele. Auf Linien zahlt es nicht.`);
    boot.append(bootText);
    const angler = document.createElement("li");
    angler.append(symbolElement(ANGLER));
    const anglerText = document.createElement("span");
    const anglerTitel = document.createElement("strong");
    anglerTitel.textContent = "Angler (Wild): ";
    anglerText.append(anglerTitel, "Ersetzt jedes Symbol außer dem Boot. In den Freispielen sammelt er die Geldwerte aller sichtbaren Fische ein.");
    angler.append(anglerText);
    sonderListe.append(boot, angler);

    // Fisch-Werte der Freispiele samt Häufigkeit
    const gesamtGewicht = FISCH_WERTE.reduce((summe, w) => summe + w.gewicht, 0);
    for (const wert of FISCH_WERTE) {
      const li = document.createElement("li");
      li.append(symbolElement(FISCH, wert.groesse));
      const faktor = document.createElement("span");
      faktor.className = "faktor";
      faktor.textContent = `×${faktorText(wert.faktor)}`;
      const betrag = document.createElement("span");
      betrag.className = "betrag";
      fischBetragElemente.push({ faktor: wert.faktor, element: betrag });
      const chance = document.createElement("span");
      chance.textContent = `${Math.round((wert.gewicht / gesamtGewicht) * 100)} % der Fische`;
      li.append(faktor, betrag, chance);
      fischwerteListe.append(li);
    }
  }

  /** Beträge der Tabellen: gelten für den aktuell wirksamen Einsatz. */
  function tabelleBetraegeAktualisieren() {
    const einsatz = wirksamerEinsatz() || gewaehlterEinsatz;
    tabelleHinweis.textContent =
      `Linien-Gewinn = Quote × ein Zehntel des Gesamteinsatzes. Die großen Zahlen zeigen ihn für deinen Einsatz von ${zahlText(einsatz)} ` +
      `(Netto-Gewinn = Auszahlung minus Einsatz). Gewertet wird immer von der linken Walze aus.`;
    for (const { quote, element } of betragElemente) element.textContent = zahlText(linienBetrag(quote, einsatz));
    for (const { faktor, element } of fischBetragElemente) element.textContent = zahlText(fischBetrag(faktor, einsatz));
    if (scatterBetragElement) scatterBetragElement.textContent = zahlText(SCATTER_FAKTOR * einsatz);
  }

  // ---------------------------------------------------------
  // Anzeigen
  // ---------------------------------------------------------

  function seiteAktualisieren() {
    toplisteAnzeigen(toplisteElement, SPIEL, (p) => `+${zahlText(p)}`);
    const pleiten = statistik().pleiten;
    kontoInfo.textContent =
      `Pleiten bisher: ${pleiten}. „Konto zurücksetzen“ setzt das gemeinsame Spielgeld-Konto auf ${zahlText(STARTGELD)}. ` +
      `Rekorde bleiben erhalten, der Pleiten-Zähler zählt dabei mit.`;
  }

  /** Setzt Text und Farbe (plus/minus) von Gewinn-Anzeige und HUD-Feld. */
  function ergebnisAnzeigen(netto) {
    // Netto 0 ist hier möglich (z. B. 3 Muscheln bei Einsatz 10 zahlen genau den Einsatz zurück): neutral anzeigen
    const text = netto > 0 ? `+${zahlText(netto)}` : netto < 0 ? `−${zahlText(Math.abs(netto))}` : "±0";   // echtes Minuszeichen
    const art = netto > 0 ? "plus" : netto < 0 ? "minus" : "";
    gewinnAnzeige.textContent = text;
    gewinnAnzeige.className = `gewinn-anzeige ${art}`.trim();
    hudLetzter.textContent = text;
    hudLetzter.className = `wert ${art}`.trim();
    if (netto > 0 && !bewegungReduziert()) animationNeuStarten(gewinnAnzeige, "rekord-puls");
  }

  /** Kurzer Satz über die Linien-Gewinne eines Drehs. */
  function linienText(linien) {
    if (linien.gewinne.length === 0) return "";
    const n = linien.gewinne.length;
    return `${n} ${n === 1 ? "Linie gewinnt" : "Linien gewinnen"}: +${zahlText(linien.summe)}`;
  }

  /** Entfernt alle Gewinn-Effekte des letzten Drehs und setzt die Fisch-Zellen zurück. */
  function effekteLoeschen() {
    overlay.replaceChildren();
    linienAnzeige.zuruecksetzen();
    fensterElement.querySelectorAll(".zelle.gewinn-blinken, .zelle.scatter-treffer, .zelle.scatter-spannung, .zelle.knapp, .zelle.sammelt, .zelle.eingesammelt")
      .forEach((z) => z.classList.remove("gewinn-blinken", "scatter-treffer", "scatter-spannung", "knapp", "sammelt", "eingesammelt"));
    // Lauflicht-Rahmen zurück in den Leerlauf (siehe spiel.css: .dreht = schnell, .gewinn = golden)
    fensterElement.classList.remove("dreht", "gewinn", "spannung");
    buehne.classList.remove("spannung");
    walzenElemente.forEach((w) => w.classList.remove("spannung-walze"));
    for (const zelle of fischZellen) {
      zelle.querySelector(".plakette")?.remove();
      zelle.querySelector("use")?.setAttribute("href", "#sym-fisch-mittel");
    }
    fischZellen = [];
    tabelleKoerper.querySelectorAll("tr.treffer").forEach((tr) => tr.classList.remove("treffer"));
  }

  /**
   * Hängt die Geldwert-Plaketten an die Fische des ZIEL-Fensters, noch BEVOR die Walzen
   * loslaufen. So sieht man sie schon beim Auslaufen der Walzen. Das Fisch-Bild wird passend
   * zur Größe des Wertes gewählt (klein / mittel / groß).
   */
  function plakettenSetzen(ergebnis) {
    if (!ergebnis.sammeln) return;
    for (const fisch of ergebnis.sammeln.fische) {
      const zelle = zelleFuer(fisch.spalte, fisch.zeile, ergebnis.stopps);
      zelle.querySelector("use").setAttribute("href", `#sym-fisch-${fisch.groesse}`);
      const plakette = document.createElement("span");
      plakette.className = fisch.groesse === "gross" ? "plakette gross" : "plakette";
      plakette.textContent = zahlText(fisch.betrag);
      plakette.title = `Fisch: ×${faktorText(fisch.faktor)} vom Gesamteinsatz`;
      zelle.append(plakette);
      fischZellen.push(zelle);
    }
  }

  /**
   * Zeigt die Treffer eines Drehs: Gewinnlinien als farbiger Linienzug, gewinnende Felder
   * pulsieren, Boote (ab 3) pulsieren, Tabellenzeilen werden markiert. Das Pulsieren ist reine
   * Deko und läuft nur, wenn der Nutzer keine reduzierte Bewegung wünscht.
   */
  function treffernZeigen(ergebnis) {
    const deko = !bewegungReduziert();
    // JEDER Liniengewinn feiert, auch wenn die Auszahlung unter dem Einsatz liegt (das tun echte Geräte
    // genauso, siehe Lernbox "Die Psychologie echter Automaten"): Lichtlauf, Mini-Jingle, golden leuchtender
    // Rahmen. Die Netto-Anzeige bleibt trotzdem ehrlich: Sie zeigt immer Auszahlung minus Einsatz.
    if (ergebnis.gesamt > 0) fensterElement.classList.add("gewinn");
    if (ergebnis.linien.gewinne.length > 0) klang(klangGewinn, 0);
    for (const gewinn of ergebnis.linien.gewinne) {
      const punkte = gewinn.zellen.map(([spalte, zeile]) => `${spalte + 0.5},${zeile + 0.5}`);
      const linie = document.createElementNS(SVG_NS, "polyline");
      linie.setAttribute("points", punkte.join(" "));
      linie.setAttribute("stroke", linienAnzeige.farbe(gewinn.linie));
      overlay.append(linie);
      // Der Tab dieser Linie leuchtet in derselben Farbe; der Puls startet versetzt wie der Lichtlauf (leuchten() beachtet "Bewegung reduzieren")
      linienAnzeige.leuchten(gewinn.linie, true, (gewinn.linie % 5) * 0.11);
      // LICHTLAUF: Ein helles Lichtpaket läuft die Linie entlang. Technik: dieselbe Linie noch einmal als <path>
      // mit pathLength="1" (die Länge zählt dann als 1, egal wie lang die Linie ist) und einem Strich-Muster aus
      // "kurz an, lang aus". Die CSS-Animation schiebt das Muster per stroke-dashoffset von 0 auf -0,5 entlang
      // des Pfads (siehe spiel.css, @keyframes lichtlauf). Jede Linie startet ein wenig versetzt.
      const licht = document.createElementNS(SVG_NS, "path");
      licht.setAttribute("d", "M" + punkte.join(" L"));
      licht.setAttribute("pathLength", "1");
      licht.setAttribute("class", "gewinn-licht");
      licht.style.animationDelay = `${((gewinn.linie % 5) * 0.11).toFixed(2)}s`;
      overlay.append(licht);
      tabelleKoerper.querySelector(`tr[data-symbol="${gewinn.symbol}"]`)?.classList.add("treffer");
      if (deko) for (const [spalte, zeile] of gewinn.zellen) zelleFuer(spalte, zeile, ergebnis.stopps).classList.add("gewinn-blinken");
    }
    if (deko && ergebnis.scatter.freispiele > 0) {
      for (const [spalte, zeile] of ergebnis.scatter.zellen) zelleFuer(spalte, zeile, ergebnis.stopps).classList.add("scatter-treffer");
    }
  }

  // ---------------------------------------------------------
  // Walzen-Animation
  // ---------------------------------------------------------

  /** Markiert Felder (zellen = Liste von [spalte, zeile]) des Ziel-Fensters mit einer Klasse oder nimmt sie weg. */
  function zellenMarkieren(zellen, stoppWerte, klasse, an = true) {
    for (const [spalte, zeile] of zellen) zelleFuer(spalte, zeile, stoppWerte)?.classList.toggle(klasse, an);
  }

  /**
   * Schaltet die Spannungs-Optik ein oder aus: Spannungs-Glow auf der Bühne, schneller
   * Lauflicht-Rahmen, und die Boote, die schon liegen, pulsieren golden. Rein optisch;
   * das Ergebnis steht längst fest (siehe spannungErmitteln).
   */
  function spannungSetzen(an, spannung = null, stoppWerte = null) {
    buehne.classList.toggle("spannung", an);
    fensterElement.classList.toggle("spannung", an);
    if (an && spannung) zellenMarkieren(spannung.scatter, stoppWerte, "scatter-spannung");
  }

  /**
   * Lässt die Walzen von `stopps` zu `ziel` laufen und liefert ein Promise,
   * das erst erfüllt wird, wenn die letzte Walze ruht. Mit requestAnimationFrame
   * wird in jedem Bildschirm-Frame die Position aus der verstrichenen Zeit
   * berechnet (nicht aus "Frames zählen"): So ist der Ablauf auf 60-Hz- und
   * 144-Hz-Bildschirmen gleich lang. `schnell` verkürzt den Lauf in den Freispielen.
   *
   * Dazu kommen Ton und Spannung: Beim Start surrt der Dreh-Klang, jede Walze stoppt mit einem
   * Tick. Liegen nach den ersten Walzen schon 2 Boote (spannungErmitteln), drehen die übrigen
   * Walzen länger und bremsen langsamer, die Boote pulsieren golden, und pro betroffener Walze
   * läuft der Spannungs-Ton. Das Ergebnis ändert das nicht: Wo die Walzen stoppen, steht vorher fest.
   */
  function walzenLaufenLassen(ziel, schnell = false) {
    const zielFenster = fensterAusStopps(ziel, aktuelleBaender);
    const spannung = spannungErmitteln(zielFenster);
    klang(klangSpinStart);      // läuft noch synchron im Klick: erlaubt dem Browser den Ton zu starten

    // Reduzierte Bewegung: kein Lauf, Ergebnis fast sofort. Die Spannung schrumpft auf höchstens 0,3 s Wartezeit.
    if (bewegungReduziert()) {
      stopps = [...ziel];
      alleWalzenSetzen();
      klang(klangWalzenStopp, SPALTEN - 1);
      if (spannung.ab < 0) return warte(150);
      return (async () => {
        await warte(150);
        spannungSetzen(true, spannung, ziel);
        klang(klangSpannung);
        await warte(300);
        spannungSetzen(false);
      })();
    }

    const plaene = schnell
      ? laufPlanErstellen(stopps, ziel, laengen, 0.3, 0.1, spannung.ab)
      : laufPlanErstellen(stopps, ziel, laengen, 0.45, 0.2, spannung.ab);
    const ruht = plaene.map(() => false);
    const spannungLaeuft = plaene.map(() => false);
    fensterElement.classList.add("dreht");
    walzenElemente.forEach((w) => w.classList.add("laeuft"));

    return new Promise((fertig) => {
      const startZeit = performance.now();
      function bild(jetzt) {
        const t = (jetzt - startZeit) / 1000;
        let nochAktiv = 0;
        plaene.forEach((plan, i) => {
          if (ruht[i]) return;
          // Die Spannung einer Walze beginnt in dem Moment, in dem die Walze davor ruht.
          if (plan.spannung && !spannungLaeuft[i] && t >= plan.spannungStart) {
            spannungLaeuft[i] = true;
            if (i === spannung.ab) spannungSetzen(true, spannung, ziel);
            walzenElemente[i].classList.add("spannung-walze");
            klang(klangSpannung);
          }
          if (t >= plan.ende) {
            positionSetzen(i, ziel[i]);                      // exakt aufs Ziel (keine Rundungsreste)
            walzenElemente[i].classList.remove("laeuft", "spannung-walze");
            ruht[i] = true;
            klang(klangWalzenStopp, i);
            // Fällt auf einer Walze mit Spannung ein Boot, leuchtet es sofort golden mit.
            if (plan.spannung) {
              zielFenster[i].forEach((symbol, zeile) => { if (symbol === BOOT) zellenMarkieren([[i, zeile]], ziel, "scatter-spannung"); });
            }
            return;
          }
          positionSetzen(i, plan.start - vorschubZurZeit(plan, t));
          nochAktiv++;
        });
        if (nochAktiv > 0) {
          requestAnimationFrame(bild);
        } else {
          stopps = [...ziel];
          alleWalzenSetzen();
          fensterElement.classList.remove("dreht");
          spannungSetzen(false);
          fertig();
        }
      }
      requestAnimationFrame(bild);
    });
  }

  /**
   * "So knapp!": Feedback für einen echten Beinahe-Gewinn (siehe fastGewinnErmitteln). Die beteiligten
   * Felder wackeln, dazu klingt der "Ooh"-Ton. Gibt den Satz für die Statuszeile zurück (oder "").
   * Nichts davon beeinflusst das Ergebnis, es zeigt nur, was zufällig vorkam.
   */
  async function knappZeigen(ergebnis) {
    const fast = fastGewinnErmitteln(ergebnis.fenster, ergebnis.linien, ergebnis.scatter);
    if (!fast) return "";
    const reduziert = bewegungReduziert();
    // Gab es schon einen Gewinn-Jingle, kurz warten, damit sich beide Klänge nicht überlagern.
    if (ergebnis.linien.gewinne.length > 0) await warte(reduziert ? 100 : 500);
    zellenMarkieren(fast.zellen, ergebnis.stopps, "scatter-spannung", false);
    zellenMarkieren(fast.zellen, ergebnis.stopps, "knapp");
    klang(klangFastGewinn);
    const text = fast.art === "scatter"
      ? "So knapp! Zwei Boote liegen, für die Freispiele fehlt das dritte."
      : "So knapp! Das fünfte passende Symbol liegt direkt daneben.";
    drehInfo.textContent = text;
    await warte(reduziert ? 150 : 1000);
    return text;
  }

  /** Gewinnfeier mit Ton: Jingle passend zur Stufe, dazu Münz-Ticks, solange der Betrag hochzählt. */
  async function feiern(optionen) {
    const stufe = stufeBestimmen(optionen.betrag, optionen.einsatz);
    let ticksStoppen = () => {};
    if (stufe > 0) {
      klang(klangGewinn, stufe);
      ticksStoppen = muenzTicksStarten(STUFEN[stufe - 1].tickerMs);
    }
    try {
      return await gewinnFeiern({ buehne, ...optionen });
    } finally {
      ticksStoppen();
    }
  }

  // ---------------------------------------------------------
  // Das Sammel-Feature: Einsammel-Animation
  // ---------------------------------------------------------

  /** Mittelpunkt eines Elements, gemessen von der linken oberen Ecke der Bühne aus. */
  function mitteInBuehne(element) {
    const b = buehne.getBoundingClientRect();
    const r = element.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left - buehne.clientLeft, y: r.top + r.height / 2 - b.top - buehne.clientTop };
  }

  /**
   * Spielt das Einsammeln ab: Pro Angler fliegen die Wert-Plaketten ALLER Fische zu ihm,
   * und die laufende Summe wächst mit jeder Landung. Mehrere Angler = mehrere Durchgänge.
   * Bei "Bewegung reduzieren" gibt es keinen Flug, die Summe springt sofort.
   * (Das GELD selbst steht längst fest, hier wird nur angezeigt.)
   */
  async function einsammeln(ergebnis) {
    const sammeln = ergebnis.sammeln;
    if (!sammeln || sammeln.einsammlungen.length === 0) return;
    const reduziert = bewegungReduziert();
    fensterElement.classList.add("gewinn");

    for (const einsammlung of sammeln.einsammlungen) {
      const anglerZelle = zelleFuer(einsammlung.angler.spalte, einsammlung.angler.zeile, ergebnis.stopps);
      drehInfo.textContent = `Der Angler sammelt ${sammeln.fische.length} ${sammeln.fische.length === 1 ? "Fisch" : "Fische"} ein: +${zahlText(einsammlung.summe)}`;

      if (reduziert) {
        summeAnzeigen(angezeigteSumme + einsammlung.summe);
        continue;
      }

      anglerZelle.classList.add("sammelt");
      const ziel = mitteInBuehne(anglerZelle);
      const fluege = sammeln.fische.map((fisch, i) => {
        const fischZelle = zelleFuer(fisch.spalte, fisch.zeile, ergebnis.stopps);
        const von = mitteInBuehne(fischZelle);
        const marke = document.createElement("span");
        marke.className = "flug-wert";
        marke.textContent = zahlText(fisch.betrag);
        buehne.append(marke);
        const halbB = marke.offsetWidth / 2;
        const halbH = marke.offsetHeight / 2;
        // Web-Animations-API: zwei Schlüsselbilder (Start am Fisch, Ziel am Angler), der Browser rechnet dazwischen.
        const animation = marke.animate([
          { transform: `translate(${von.x - halbB}px, ${von.y - halbH}px) scale(1)`, opacity: 1 },
          { transform: `translate(${ziel.x - halbB}px, ${ziel.y - halbH}px) scale(.45)`, opacity: 0.9 },
        ], { duration: 520, delay: i * 90, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
        setTimeout(() => fischZelle.classList.add("eingesammelt"), i * 90);
        return animation.finished.then(() => {
          marke.remove();
          summeAnzeigen(angezeigteSumme + fisch.betrag);
          klang(klangMuenzTick);                      // jede landende Plakette "klingelt" (die Landungen kommen im Abstand von 90 ms)
        });
      });
      await Promise.all(fluege);
      anglerZelle.classList.remove("sammelt");
      await warte(180);
    }
  }

  // ---------------------------------------------------------
  // Abrechnung (Geld)
  // ---------------------------------------------------------

  /**
   * Schreibt die Auszahlung eines bezahlten Drehs OHNE Freispiele gut. Wird normalerweise
   * nach der Animation aufgerufen, aber auch bei "pagehide" (Seite wird verlassen), damit
   * ein Gewinn nicht verloren geht, wenn man mitten im Dreh wegklickt. Das Flag
   * "abgerechnet" verhindert, dass doppelt gutgeschrieben wird.
   * Läuft eine Freispiel-Serie (fsZustand), gehört die Auszahlung IHR: Sie steckt im
   * gespeicherten Zustand und wird beim Abschluss der Serie (oder beim nächsten Besuch) gebucht.
   */
  function rundeAbrechnen() {
    if (!offeneRunde || offeneRunde.abgerechnet || fsZustand) return;
    offeneRunde.abgerechnet = true;
    rundeAbschliessen(offeneRunde.einsatz, offeneRunde.auszahlung);
  }
  window.addEventListener("pagehide", rundeAbrechnen);

  // ---------------------------------------------------------
  // Pleite-Dialog
  // ---------------------------------------------------------

  /**
   * Eigener Dialog in der Optik von .spiel-dialog (style.css). Es gibt nur
   * eine Möglichkeit: neues Startgeld. Deshalb löst auch das Schließen mit
   * Esc den Neustart aus (Ereignis "close"), niemand bleibt ohne Geld hängen.
   */
  function pleiteDialogZeigen() {
    if (document.getElementById("pleite-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.className = "spiel-dialog";
    dialog.id = "pleite-dialog";

    const titel = document.createElement("h2");
    titel.textContent = "Pleite!";
    const text = document.createElement("p");
    text.textContent = "Du bekommst neues Startgeld.";
    const betrag = document.createElement("p");
    betrag.className = "gross";
    betrag.textContent = zahlText(STARTGELD);
    const aktionen = document.createElement("div");
    aktionen.className = "aktionen";
    const weiter = document.createElement("button");
    weiter.type = "button";
    weiter.className = "knopf primaer";
    weiter.textContent = "Weiterspielen";
    weiter.addEventListener("click", () => dialog.close());
    aktionen.append(weiter);
    dialog.append(titel, text, betrag, aktionen);

    dialog.addEventListener("close", () => {
      pleiteNeustart();                    // Konto zurück auf Startgeld, Pleiten-Zähler +1
      walletHudAktualisieren();
      dialog.remove();
      seiteAktualisieren();
      steuerungAktualisieren();
    });

    document.body.append(dialog);
    dialog.showModal();
  }

  // ---------------------------------------------------------
  // Freispiele
  // ---------------------------------------------------------

  /**
   * Spielt eine komplette Freispiel-Serie ab, bis keine Freispiele mehr übrig sind, und
   * bucht danach die GESAMTE Runde (bezahlter Dreh + alle Freispiele) mit einem einzigen
   * rundeAbschliessen()-Aufruf. Dadurch zählt die Topliste den Netto-Gewinn der ganzen Runde.
   *
   * Wichtig für die Fairness: Jedes Freispiel wird ausgewürfelt, verbucht und GESPEICHERT,
   * BEVOR die Walzen loslaufen. Schließt jemand mittendrin die Seite, steht das Ergebnis
   * des laufenden Freispiels schon fest, und es gibt kein Neuwürfeln durch Neuladen.
   */
  async function freispieleAbspielen() {
    modusSetzen("freispiel");
    summeAnzeigen(fsZustand.summe);                     // Startwert: was der bezahlte Dreh (und frühere Freispiele) schon gebracht hat

    while (fsZustand.rest > 0) {
      const einsatz = fsZustand.einsatz;
      const nummer = fsZustand.gespielt + 1;
      fsZaehlerAnzeigen(nummer, fsZustand.gespielt + fsZustand.rest);

      // 1. Auswürfeln, verbuchen, speichern (alles noch vor der Animation)
      const ergebnis = drehAuswerten(BAENDER_FREISPIEL, einsatz, true);
      const vorherSumme = angezeigteSumme;
      fsZustand = freispielVerbuchen(fsZustand, ergebnis);
      speichere(SPIEL, FS_SCHLUESSEL, fsZustand);

      // 2. Fische mit Werten versehen und Walzen laufen lassen
      effekteLoeschen();
      drehInfo.textContent = `Freispiel ${nummer} …`;
      plakettenSetzen(ergebnis);
      await walzenLaufenLassen(ergebnis.stopps, true);

      // 3. Linien und Scatter anzeigen
      summeAnzeigen(vorherSumme + ergebnis.linien.summe + ergebnis.scatter.betrag);
      treffernZeigen(ergebnis);
      const teile = [linienText(ergebnis.linien)];
      if (ergebnis.scatter.freispiele > 0) {
        teile.push(`${ergebnis.scatter.anzahl} Boote: +${FREISPIELE_PRO_AUSLOESUNG} Freispiele und +${zahlText(ergebnis.scatter.betrag)}`);
        klang(klangGewinn, 2);                          // erneut 3 Boote: der große Jingle noch einmal
      }
      const anzeigeText = teile.filter(Boolean).join(" · ");
      if (anzeigeText) drehInfo.textContent = anzeigeText;
      else if (ergebnis.sammeln.fische.length === 0) drehInfo.textContent = `Freispiel ${nummer}: kein Treffer.`;
      if (ergebnis.scatter.freispiele > 0) fsZaehlerAnzeigen(nummer, fsZustand.gespielt + fsZustand.rest);
      await warte(anzeigeText ? 750 : 300);
      const knappText = await knappZeigen(ergebnis);
      if (knappText) drehInfo.textContent = anzeigeText ? `${anzeigeText} ${knappText}` : knappText;

      // 4. Der Angler sammelt ein (oder auch nicht)
      if (ergebnis.sammeln.angler.length === 0 && ergebnis.sammeln.fische.length > 0) {
        drehInfo.textContent = "Fische, aber kein Angler: Die Werte verfallen.";
        await warte(500);
      }
      await einsammeln(ergebnis);

      // 5. Große Gewinne feiern (ab x5 vom Gesamteinsatz, siehe assets/gewinnfeier.js): die Auszahlung
      //    dieses Freispiels inklusive gesammelter Fische. Ein Klick überspringt die Feier.
      hoechsteStufe = Math.max(hoechsteStufe, await feiern({ betrag: ergebnis.gesamt, einsatz }));
      await warte(ergebnis.sammeln.einsammlungen.length > 0 ? 550 : 250);
    }

    // Serie vorbei: einmal abrechnen, Zustand löschen (beides ohne Pause dazwischen)
    const summe = fsZustand.summe;
    const einsatz = fsZustand.einsatz;
    rundeAbschliessen(einsatz, summe);
    fsZustand = null;
    entferne(SPIEL, FS_SCHLUESSEL);
    if (offeneRunde) offeneRunde.abgerechnet = true;

    const netto = summe - einsatz;
    walletHudAktualisieren();
    ergebnisAnzeigen(netto);
    summeAnzeigen(summe);
    drehInfo.textContent = `Freispiele beendet. Gesamtauszahlung ${zahlText(summe)} (Netto ${netto >= 0 ? "+" : "−"}${zahlText(Math.abs(netto))}).`;
    // Den GESAMTgewinn der Serie feiern, aber nur, wenn er eine höhere Stufe erreicht als alles, was in
    // dieser Runde schon einzeln gefeiert wurde. Sonst würde sich dieselbe Stufe doppelt feiern.
    if (stufeBestimmen(summe, einsatz) > hoechsteStufe) {
      await feiern({ betrag: summe, einsatz, zusatz: "FREISPIELE GESAMT" });
    }
    await warte(bewegungReduziert() ? 400 : 1800);
    effekteLoeschen();
    modusSetzen("basis");
    return netto;
  }

  // ---------------------------------------------------------
  // Ein bezahlter Dreh
  // ---------------------------------------------------------

  /** Gemeinsamer Abschluss nach jeder Runde: Sperre lösen, Topliste, Pleite-Prüfung. */
  function rundeNachbereiten(netto, fokusWar) {
    offeneRunde = null;
    laeuft = false;
    steuerungAktualisieren();
    // Der Knopf war beim Sperren fokussiert und hat den Fokus verloren: Tastatur-Nutzer zurück an die Stelle holen
    if (fokusWar instanceof HTMLButtonElement && document.activeElement === document.body && !fokusWar.disabled) {
      fokusWar.focus({ preventScroll: true });
    }
    // Topliste: Netto-Gewinne ab der Mindesthöhe werden STILL eingetragen (zuletzt benutzte
    // Initialen) – kein Dialog, keine Aufforderung.
    if (netto >= MINDEST_NETTO_FUER_TOPLISTE && stillEintragen(SPIEL, netto) !== null) seiteAktualisieren();
    // Pleite? (Konto unter dem kleinsten Einsatz)
    if (istPleite(EINSATZSTUFEN[0])) pleiteDialogZeigen();
  }

  async function drehen() {
    if (laeuft) return;
    const einsatz = wirksamerEinsatz();
    if (einsatz === 0 || !einsatzAbbuchen(einsatz)) return;      // Konto reicht nicht: Dreh startet nicht

    laeuft = true;
    hoechsteStufe = 0;
    const fokusWar = document.activeElement;
    walletHudAktualisieren();                                    // der Einsatz verschwindet sofort vom Konto
    steuerungAktualisieren();
    effekteLoeschen();
    gewinnAnzeige.textContent = "";
    gewinnAnzeige.className = "gewinn-anzeige";
    drehInfo.textContent = "Die Walzen laufen …";

    // 1. Ergebnis auswürfeln und auswerten – BEVOR die Animation startet
    const ergebnis = drehAuswerten(BAENDER_BASIS, einsatz, false);
    offeneRunde = { einsatz, auszahlung: ergebnis.gesamt, abgerechnet: false };
    const loestAus = ergebnis.scatter.freispiele > 0;
    if (loestAus) {
      // Ab jetzt gehört die Auszahlung der Freispiel-Serie: Sie wird gespeichert, damit nichts
      // verloren geht, falls die Seite vor dem Ende der Serie geschlossen wird.
      fsZustand = freispielStarten(einsatz, ergebnis.gesamt);
      speichere(SPIEL, FS_SCHLUESSEL, fsZustand);
    }

    // 2. Walzen laufen lassen (stoppen links nach rechts)
    await walzenLaufenLassen(ergebnis.stopps);

    // 3. Linien und Scatter anzeigen (plus "So knapp!", falls der Zufall einen Beinahe-Gewinn geliefert hat)
    treffernZeigen(ergebnis);
    const knappText = await knappZeigen(ergebnis);
    if (!loestAus) {
      const netto = ergebnis.gesamt - einsatz;
      rundeAbrechnen();
      walletHudAktualisieren();
      ergebnisAnzeigen(netto);
      const grundText = ergebnis.linien.gewinne.length > 0 ? linienText(ergebnis.linien) : "Leider kein Treffer.";
      drehInfo.textContent = knappText ? `${grundText} ${knappText}` : grundText;
      // Große Gewinne feiern (ab x5 vom Einsatz) VOR dem Entsperren; ein Klick überspringt die Feier.
      await feiern({ betrag: ergebnis.gesamt, einsatz });
      rundeNachbereiten(netto, fokusWar);
      return;
    }

    // 4. Scatter: Freispiele starten, am Ende die ganze Runde abrechnen.
    //    Auch der auslösende Dreh selbst wird gefeiert (Linien + Scatter-Gewinn), falls er groß genug ist.
    hoechsteStufe = await feiern({ betrag: ergebnis.gesamt, einsatz });
    klang(klangGewinn, 2);                                          // Freispiel-Start: der große Jingle (Stufe 2)
    drehInfo.textContent = `${ergebnis.scatter.anzahl} Fischerboote! Gesamteinsatz ×${SCATTER_FAKTOR} (+${zahlText(ergebnis.scatter.betrag)}) und ${FREISPIELE_PRO_AUSLOESUNG} Freispiele.`;
    await warte(bewegungReduziert() ? 600 : 1700);
    const netto = await freispieleAbspielen();
    rundeNachbereiten(netto, fokusWar);
  }

  /**
   * Beim Seitenstart: Läuft noch eine gespeicherte Freispiel-Serie, wird sie fortgesetzt.
   * (Auch eine bereits "leere" Serie mit rest = 0 wird so sauber abgerechnet.)
   */
  async function freispieleFortsetzen() {
    laeuft = true;
    offeneRunde = { einsatz: fsZustand.einsatz, auszahlung: fsZustand.summe, abgerechnet: false };
    steuerungAktualisieren();
    modusSetzen("freispiel");
    fsZaehlerAnzeigen(fsZustand.gespielt, fsZustand.gespielt + fsZustand.rest);
    summeAnzeigen(fsZustand.summe);
    drehInfo.textContent = "Deine Freispiele werden fortgesetzt …";
    await warte(bewegungReduziert() ? 300 : 1200);
    const netto = await freispieleAbspielen();
    rundeNachbereiten(netto, null);
  }

  // ---------------------------------------------------------
  // Eingabe
  // ---------------------------------------------------------
  drehKnopf.addEventListener("click", drehen);
  chipKnoepfe.forEach((chip) => {
    chip.addEventListener("click", (e) => {
      einsatzWaehlen(Number(chip.dataset.einsatz));
      // Mit Maus/Finger angeklickt (detail > 0): Fokus loslassen, damit die Leertaste danach
      // dreht. Per Tastatur ausgelöst (detail = 0) bleibt der Fokus auf dem Chip.
      if (e.detail > 0) chip.blur();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;   // Browser-Kürzel nicht stören, Dauerdruck ignorieren
    if (document.querySelector("dialog[open]")) return;           // Dialog offen -> Tasten gehören ihm
    const tag = e.target instanceof Element ? e.target.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === " ") {
      // Auf einem fokussierten Knopf/Link/Aufklapper macht die Leertaste schon etwas
      // (anklicken). Dort NICHT zusätzlich drehen, sonst würde es doppelt ausgelöst.
      if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
      e.preventDefault();                                          // Seite nicht scrollen
      drehen();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= EINSATZSTUFEN.length) {
      einsatzWaehlen(EINSATZSTUFEN[Number(e.key) - 1]);       // Taste 1 = erster Chip, 2 = zweiter …
    }
  });

  // Reset 1: NUR die Angelglück-Topliste. entferne() löscht gezielt den Schlüssel "topliste";
  // spielZuruecksetzen("angelglueck") wäre zu grob, es würde auch den gemerkten Einsatz und
  // eine laufende Freispiel-Serie löschen.
  resetKnopf.addEventListener("click", () => {
    if (laeuft) return;
    entferne(SPIEL, "topliste");
    seiteAktualisieren();
  });

  // Reset 2: Konto zurücksetzen mit Rückfrage (zweiter Klick innerhalb von 4 Sekunden).
  // Technisch derselbe Weg wie nach einer Pleite: pleiteNeustart() setzt das Konto auf
  // Startgeld, lässt die Rekorde stehen und erhöht den Pleiten-Zähler.
  let kontoResetBereit = false;
  let kontoResetTimer = 0;
  function kontoResetEntschaerfen() {
    kontoResetBereit = false;
    clearTimeout(kontoResetTimer);
    kontoResetKnopf.textContent = "Konto zurücksetzen";
  }
  kontoResetKnopf.addEventListener("click", () => {
    if (laeuft) return;
    if (!kontoResetBereit) {
      kontoResetBereit = true;
      kontoResetKnopf.textContent = "Wirklich zurücksetzen?";
      kontoResetTimer = setTimeout(kontoResetEntschaerfen, 4000);
      return;
    }
    kontoResetEntschaerfen();
    pleiteNeustart();
    walletHudAktualisieren();
    seiteAktualisieren();
    steuerungAktualisieren();
    drehInfo.textContent = `Konto zurückgesetzt auf ${zahlText(STARTGELD)}.`;
  });

  // ----- Start -----
  const kopfElement = document.querySelector(".spiel-kopf");
  if (kopfElement) tonKnopf(kopfElement);                         // Ton an/aus, gilt für alle Casino-Spiele
  walletHud(document.getElementById("wallet-hud"));
  LINIEN.forEach((reihen, i) => linienBilder.append(linienBildBauen(reihen, i + 1)));
  fsZustand = freispielZustandPruefen(lade(SPIEL, FS_SCHLUESSEL, null));
  if (!fsZustand) entferne(SPIEL, FS_SCHLUESSEL);               // kaputten oder veralteten Stand wegräumen
  baenderAufbauen();
  alleWalzenSetzen();
  tabelleAufbauen();
  steuerungAktualisieren();
  seiteAktualisieren();
  if (fsZustand) {
    freispieleFortsetzen();
  } else if (istPleite(EINSATZSTUFEN[0])) {
    pleiteDialogZeigen();                                       // z. B. nach Seitenwechsel mit leerem Konto
  }
}

// Nur im Browser starten. In Node (Tests/Simulation) gibt es kein "document" –
// dort werden nur die reinen Funktionen oben importiert.
if (typeof document !== "undefined") {
  starteSpiel();
}
