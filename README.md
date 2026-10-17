# Browser-Arcade

Kleine Browser-Klassiker als rein statische Website: nur HTML, CSS und Vanilla-JavaScript.
Kein Backend, keine Datenbank, keine Cookies, keine externen Dienste, kein Build-Schritt.
Alles, was gespeichert wird (Highscores, Spielstände, freigeschaltete Level), liegt im
localStorage des Browsers.

**Enthalten:** Snake, Pixelrex, Flattervogel, Froschsprung, Mauerbrecher, Meteorsturm
(Arcade, alle mit Leveln und Handy-Steuerung), 2048, Minesweeper, Sudoku, Solitär,
Wortfuchs, Zahlenraten und ein Casino-Bereich mit Spielgeld.

Code und Kommentare sind bewusst auf Deutsch und ausführlich: Jede Spielseite hat
eine aufklappbare Lernbox „Wie funktioniert der Code?“.

## Starten

Wegen der ES-Module braucht es einen (beliebigen) Webserver, ein Doppelklick auf die
HTML-Datei reicht nicht:

```bash
python3 -m http.server 8000
# dann http://localhost:8000/ öffnen
```

Alternativ XAMPP, nginx, Apache oder jeder statische Hoster (GitHub Pages, Netlify …):
Ordnerinhalt einfach hochladen.

## Vor dem Veröffentlichen

`impressum.html` und `datenschutz.html` sind **Vorlagen** mit Platzhaltern in eckigen
Klammern. Bitte mit eigenen Angaben füllen und für das eigene Angebot prüfen
(keine Rechtsberatung).

## Ordnerstruktur

```
games/
├── index.html            Hub: Übersicht aller Spiele
├── impressum.html        Rechtliches (angepasst von der Landing)
├── datenschutz.html      inkl. localStorage-Abschnitt
├── 404.html              Fehlerseite
├── favicon.svg           eigenes Pixel-Joystick-Icon
├── assets/
│   ├── style.css         zentrales Arcade-Design-System (ausführlich kommentiert)
│   ├── storage.js        localStorage-Wrapper + Top-3-Logik (EINZIGER Ort für Speicherzugriffe)
│   ├── ui.js             geteilte UI-Bausteine (Game-Over-Dialog, Topliste, Zähler-Animation)
│   ├── wallet.js         gemeinsames Spielgeld-Konto der Casino-Spiele (Startgeld 1.000)
│   ├── gewinnfeier.js    eskalierende Gewinn-Animationen der Slots (Stufen ab x5/x15/x40, Partikel-Engine)
│   ├── klang.js          synthetisierte Klänge der Slots (Web Audio, keine Audiodateien), globaler Ton-Knopf
│   ├── gewinnlinien.js   Nummern-Tabs der 10 Gewinnlinien neben den 5x3-Slots, Linien-Vorschau (Hover/Tippen), Gewinn-Leuchten
│   ├── gewinnlinien.css  Styles dazu (Tabs, Vorschau-Polylinie)
│   ├── risiko.js         Risiko-Feature (Risikoleiter + Rot/Schwarz, 50/50): reine Regeln, Leiter-/Karten-Komponente, Overlay der Slots
│   ├── mobil.js          Handy-Baustein der Arcade-Spiele: Einpassen, Gamepad, Scroll-Sperre, Spielmodus, Röhren-Look, Live-Region
│   ├── levelwahl.js      Level-Auswahl mit Freischalten (speichert nur das höchste erreichte Level)
│   └── fonts/            lokal gehostete Schriften (SIL OFL 1.1) – keine Google-Dienste
└── <spiel>/              ein Ordner pro Spiel
    ├── index.html        Seite des Spiels (nutzt das gemeinsame Design)
    ├── game.js           komplette Spiellogik, ausführlich kommentiert
    └── spiel.css         nur die spielspezifischen Styles (Brett, Karten, …)
```

(Wortfuchs hat zusätzlich eine `woerter.js` mit den Wortlisten; Pixelrex,
Flattervogel, Meteorsturm und Mauerbrecher lagern ihre testbaren Rechenfunktionen
in eine eigene `logik.js` aus.)

## Arcade-Spiele: Level und Looks

| Spiel        | Level                                                                    | Look im Spielfeld                 |
| ------------ | ------------------------------------------------------------------------ | --------------------------------- |
| Snake        | 8 Labyrinth-Karten (je 10 Happen), danach endlos schneller               | LCD eines alten Handys            |
| Pixelrex     | 5 Welten nach Metern (Lava ab Welt 3, Eiszapfen ab Welt 4)               | 2x-Pixelraster                    |
| Flattervogel | 5 Abschnitte à 10 Säulen (enger, schwingend, Tageszeiten)                | 2x-Pixelraster                    |
| Froschsprung | 10 Level (Krokodile, Schlange, Fliege, Zeitbalken, Nacht), danach endlos | 8-Bit-Raster (16 px je Zelle)     |
| Mauerbrecher | 12 Karten aus Textzeilen, harte/feste Steine, Power-ups                  | flache Farbbänder der späten 70er |
| Meteorsturm  | Wellen, UFOs, Extraleben alle 10.000                                     | Vektorlinien mit Nachschein       |

**Ära-Regel:** Im Canvas gilt der Look der jeweiligen Ära, außerhalb (Rahmen, HUD,
Gamepad, Dialoge) immer das Neon-Design. Spielmechaniken sind frei, Namen, Logos,
Original-Sprites und Original-Sounds nicht: Alles wird selbst gezeichnet, keine
geschützten Spielnamen (deshalb „Mauerbrecher“ und „Meteorsturm“).

## Handy

`assets/mobil.js` wird von jeder Arcade-Seite mit einem Aufruf eingebunden
(`spielSeite({ phase, gamepad })`). Das Gamepad schickt künstliche Tastatur-Ereignisse,
die Spiele selbst kennen also nur die Tastatur. Das Canvas wird so eingepasst, dass HUD,
Feld und Gamepad zusammen auf den Bildschirm passen. Während eine Runde läuft, verschiebt
sich die Seite nicht. „Spielmodus“ blendet alles andere aus (Android: echtes Vollbild).

## Jugendschutz

Die Casino-Spiele sind simuliertes Glücksspiel (kein Echtgeld, kein Kauf). Sie tragen
den Hinweis „ab 16“. Für eine technische Kennzeichnung (age-de.xml) den kostenlosen
Label-Generator von JusProg nutzen und die Casino-Ordner mit 16 kennzeichnen.

## Wie die Teile zusammenspielen

1. **style.css** definiert Design-Tokens als CSS-Variablen (`--pink`, `--ak`, …).
   Jede Spielseite setzt am `<body>` ihre Akzentfarbe: `style="--ak:var(--pink)"` –
   damit färben sich Überschrift, HUD, Knöpfe und Dialog automatisch passend.
2. **storage.js** kapselt JEDEN localStorage-Zugriff (Schema `ba:<spiel>:<schlüssel>`,
   try/catch gegen Privatmodus, Topliste sortieren/kürzen).
3. **ui.js** liefert den fertigen Game-Over-Dialog: Rekord erkennen, Initialen abfragen,
   Topliste anzeigen. Ein Spiel ruft am Ende nur `gameOverDialog({...})` auf.
4. **game.js** jedes Spiels enthält NUR Spiellogik und Rendering. Gerendert wird je nach
   Spieltyp mit `<canvas>` (Action: Snake) oder mit DOM-Elementen/CSS-Grid (Puzzle: 2048,
   Minesweeper, Wortfuchs) – im Code steht jeweils, warum.

## Konventionen (gelten für alle Spiele)

- Deutsch benannte Variablen/Funktionen und deutsche Kommentare – der Code ist
  bewusst Lernmaterial. Jede game.js beginnt mit einem Überblickskommentar
  („So funktioniert dieses Spiel"), jede Seite hat unten eine aufklappbare
  Lernbox („Wie funktioniert der Code?") mit den wichtigsten Konzepten.
- Keine Bibliotheken, keine CDNs, keine Bilder von Dritten. Grafik entsteht aus
  CSS, Inline-SVG oder Canvas-Zeichnungen (markenrechtlich alles Eigenbau).
- Animationen: CSS-Transitions/Keyframes für UI, `requestAnimationFrame` für
  Spielschleifen. `prefers-reduced-motion` wird respektiert (CSS automatisch,
  JS über `bewegungReduziert()` aus ui.js).
- Bedienung: Tastatur UND Touch/Maus, damit alles auch am Handy läuft. Arcade-Spiele
  bekommen zusätzlich Bildschirmtasten über `mobil.js` (Wischen allein reicht nicht,
  WCAG 2.5.1). Blitz-Effekte höchstens ein Puls (WCAG 2.3.1).
- Seiten-Gerüst jeder Spielseite (Reihenfolge): Kopfzeile → `.spiel-kopf` →
  `.hud` → `.buehne` (Spielfeld) → `.steuerung` → Topliste → `.lernbox` → Fußzeile.

## Spielstände löschen

Jedes Spiel hat einen Reset. Alternativ im Browser: Einstellungen → Websitedaten
für diese Seite löschen. Es existiert keine Kopie auf dem Server.

## Geplant

Welle 4 (optional): Hot-Seat-Brettspiele (Schach, Dame, Ludo) –
abwechselnd am selben Gerät, weiterhin ohne Server.

## Code-Stil

Der Code ist mit [Prettier](https://prettier.io) formatiert (Einstellungen in `.prettierrc.json`,
Editor-Grundlagen in `.editorconfig`): 2 Leerzeichen Einrückung, eine CSS-Regel pro Zeile,
höchstens 100 Zeichen pro Zeile. Vor einem Commit einfach `npx prettier --write .` ausführen.

## Lizenz

Code: MIT, siehe `LICENSE`. Schriften in `assets/fonts/`: SIL Open Font License 1.1
(Press Start 2P und IBM Plex, siehe `assets/fonts/OFL-LIZENZ.txt`). Die Rate-Wortliste `wortfuchs/woerter-haeufig.js` stammt aus
[FrequencyWords](https://github.com/hermitdave/FrequencyWords) (Hermit Dave) und steht unter
CC BY-SA 4.0. Alle Grafiken entstehen per Canvas, CSS oder
Inline-SVG im Code, es gibt keine fremden Bilddateien. Die Spiele sind eigene Umsetzungen
bekannter Spielprinzipien, ohne Originalnamen, -grafiken oder -sounds.
