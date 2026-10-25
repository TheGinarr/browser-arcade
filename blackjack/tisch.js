/* ============================================================
   tisch.js · Blackjack am gemeinsamen Tisch (bis 4 Plätze)
   ------------------------------------------------------------
   Der Browser des Hosts führt Schuh, Dealer und Reihenfolge und
   schickt allen den sichtbaren Zustand (verdeckte Dealerkarte =
   null, der Schuh verlässt nie den Host). Jeder Platz setzt von
   seinem EIGENEN Spielgeld-Konto (wallet.js): Der Client bucht
   selbst ab, sobald der Host einen Einsatz bestätigt, und rechnet
   am Rundenende ab. Endet der Tisch mitten in einer Runde, geht
   der offene Einsatz zurück. Kein Chat, keine Namen.
   Wichtig: "./game.js?v=…" genau so importieren wie im <script> der
   index.html – sonst lädt der Browser das Modul zweimal.
   ============================================================ */
import {
  neuesDeck,
  mischen,
  handWert,
  handText,
  dealerMussZiehen,
  rundeAuswerten,
  karteBauen,
  karteFuellen,
} from "./game.js?v=20261024";
import {
  kontostand,
  einsatzAbbuchen,
  rundeAbschliessen,
  walletHudAktualisieren,
} from "../assets/wallet.js";
import { stillEintragen, toplisteAnzeigen, bewegungReduziert } from "../assets/ui.js";
import { raumEroeffnen, raumBeitreten } from "../assets/mehrspieler.js";

const SPIEL = "blackjack";
const CHIPS = [10, 25, 50, 100];
const DECKS = 4;
const ZUG_MS = 30000;
const GEBEN_NACH_MS = 15000; // so lange nach dem ersten Einsatz warten die anderen
const PAUSE_ENDE_MS = 6000;
const DEALER_MS = 700;

const $ = (sel, el = document) => el.querySelector(sel);
const el = (tag, klasse = "", text = "") => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text) e.textContent = text;
  return e;
};
const zahl = (n) => n.toLocaleString("de-DE");
const warte = (ms) =>
  new Promise((r) => setTimeout(r, bewegungReduziert() ? Math.min(ms, 150) : ms));

/* ---------- Oberfläche ---------- */
const einzelBuehne = $(".buehne.filztisch");
const einzelSteuerung = $(".steuerung");
const modi = el("div", "tisch-modi");
modi.setAttribute("role", "group");
modi.setAttribute("aria-label", "Spielart");
const kAllein = el("button", "knopf", "Allein");
const kEroeffnen = el("button", "knopf", "Tisch eröffnen");
const kBeitreten = el("button", "knopf", "Beitreten");
for (const k of [kAllein, kEroeffnen, kBeitreten]) k.type = "button";
kAllein.setAttribute("aria-pressed", "true");
modi.append(kAllein, kEroeffnen, kBeitreten);

const beitrittBox = el("form", "tisch-beitritt");
beitrittBox.hidden = true;
beitrittBox.innerHTML = `
  <label>Tisch-Code <input name="code" maxlength="4" autocomplete="off" autocapitalize="characters"
    spellcheck="false" inputmode="text" placeholder="z. B. K7PX" required /></label>
  <button type="submit" class="knopf primaer">Hinsetzen</button>
  <p class="tisch-klein">Die Spielzüge laufen direkt zwischen den Browsern. Dabei sehen die Mitspieler
  technisch deine IP-Adresse. Mehr in der <a href="../datenschutz.html#mehrspieler">Datenschutzerklärung</a>.</p>`;

const tisch = el("div", "buehne filztisch tisch-mehr");
tisch.hidden = true;
tisch.innerHTML = `
  <div class="tisch-kopf">
    <span>Tisch <b class="tisch-code"></b></span>
    <button type="button" class="knopf tisch-teilen">Code teilen</button>
    <button type="button" class="knopf tisch-verlassen">Aufstehen</button>
  </div>
  <p class="tisch-status" aria-live="polite"></p>
  <div class="tisch-bj">
  <section class="hand" aria-label="Dealer-Hand">
    <div class="hand-kopf"><span class="beschriftung">Dealer</span><span class="punkte-pill tm-dealer-punkte"></span></div>
    <div class="karten-reihe tm-dealer"></div>
  </section>
  <div class="filz-aufdruck" aria-hidden="true">BLACKJACK ZAHLT 3 : 2<span>Dealer steht auf allen 17</span></div>
  <p class="meldung tm-meldung" data-art="neutral" aria-live="polite"></p>
  <div class="tm-uhr" aria-hidden="true"><i></i></div>
  <div class="tisch-sitze"></div>
  </div>
  <div class="bedienung">
    <div class="chips tm-chips" role="group" aria-label="Einsatz wählen">
      ${CHIPS.map((c) => `<button type="button" class="chip" data-wert="${c}" aria-pressed="${c === 50}">${c}</button>`).join("")}
    </div>
    <button type="button" class="knopf primaer tm-setzen">Setzen</button>
    <button type="button" class="knopf tm-geben" hidden>Jetzt geben</button>
  </div>
  <div class="aktionen-leiste" role="group" aria-label="Aktionen">
    <button type="button" class="knopf primaer aktions-knopf" data-a="hit">Hit<small>Taste H</small></button>
    <button type="button" class="knopf primaer aktions-knopf" data-a="stand">Stand<small>Taste S</small></button>
    <button type="button" class="knopf primaer aktions-knopf" data-a="double">Double<small>Taste D</small></button>
  </div>`;

$("#wallet-hud").after(modi, beitrittBox);
einzelBuehne.after(tisch);

let chip = 50;
for (const c of tisch.querySelectorAll(".chip"))
  c.addEventListener("click", () => {
    chip = Number(c.dataset.wert);
    for (const d of tisch.querySelectorAll(".chip"))
      d.setAttribute("aria-pressed", String(d === c));
  });

/* ---------- Zustand auf diesem Gerät ---------- */
let verbindung = null; // { rolle: "host"|"gast", ... }
let meinPlatz = null;
let letzter = null; // zuletzt gezeigter Zustand
let gebucht = 0; // in dieser Runde schon vom eigenen Konto abgebucht
let gebuchtRunde = -1;
let abgerechnet = -1;

function modusZeigen(m) {
  document.body.dataset.modus = m === "allein" ? "" : "tisch";
  einzelBuehne.hidden = m !== "allein";
  if (einzelSteuerung) einzelSteuerung.hidden = m !== "allein";
  tisch.hidden = m !== "tisch";
  beitrittBox.hidden = m !== "beitreten";
  kAllein.setAttribute("aria-pressed", String(m === "allein"));
  kEroeffnen.setAttribute("aria-pressed", String(m === "tisch" && verbindung?.rolle === "host"));
  kBeitreten.setAttribute(
    "aria-pressed",
    String(m === "beitreten" || (m === "tisch" && verbindung?.rolle === "gast")),
  );
  modi.classList.toggle("gesperrt", m === "tisch");
}

function status(text, art = "neutral") {
  const s = $(".tisch-status", tisch);
  s.textContent = text || "";
  s.dataset.art = art;
}

/** Offenen Einsatz zurückgeben (Tisch weg mitten in der Runde). */
function offenesZurueck() {
  if (gebucht > 0 && abgerechnet !== gebuchtRunde) {
    rundeAbschliessen(gebucht, gebucht);
    walletHudAktualisieren();
  }
  gebucht = 0;
}

function tischEnde(grund, zurueck = true) {
  if (zurueck) offenesZurueck();
  else gebucht = 0; // mitten in der eigenen Runde aufgestanden: Einsatz verfällt
  verbindung = null;
  meinPlatz = null;
  letzter = null;
  if (host) clearTimeout(host.uhr);
  host = null;
  modusZeigen("allein");
  const m = $("#meldung");
  if (m && grund) {
    m.textContent = grund;
    m.dataset.art = "neutral";
  }
}

/* ---------- Darstellung (für Host und Gäste gleich) ---------- */
function kartenSetzen(reihe, karten) {
  reihe.replaceChildren();
  reihe.style.setProperty("--n", String(karten.length));
  for (const k of karten) {
    const karte = karteBauen(Boolean(k));
    if (k) karteFuellen(karte, k);
    reihe.append(karte.szene);
  }
}

const ERGEBNIS = {
  blackjack: "Blackjack!",
  sieg: "Gewonnen",
  push: "Unentschieden",
  niederlage: "Verloren",
};

function zeigen(z) {
  letzter = z;
  $(".tisch-code", tisch).textContent = verbindung?.code || "";
  const dealerSichtbar = z.dealer.filter(Boolean);
  kartenSetzen($(".tm-dealer", tisch), z.dealer);
  $(".tm-dealer-punkte", tisch).textContent = dealerSichtbar.length ? handText(dealerSichtbar) : "";

  const sitze = $(".tisch-sitze", tisch);
  sitze.replaceChildren();
  for (const p of Object.keys(z.sitze)
    .map(Number)
    .sort((a, b) => a - b)) {
    const s = z.sitze[p];
    const box = el("section", "tisch-sitz hand");
    box.classList.toggle("ich", p === meinPlatz);
    box.classList.toggle("dran", z.phase === "spielen" && z.dran === p);
    box.setAttribute("aria-label", `Platz ${p + 1}`);
    const kopf = el("div", "hand-kopf");
    kopf.append(
      el(
        "span",
        "beschriftung",
        p === meinPlatz ? "Du" : `Platz ${p + 1}${p === 0 ? " · Host" : ""}`,
      ),
    );
    if (s.karten.length) kopf.append(el("span", "punkte-pill", handText(s.karten)));
    if (s.einsatz) kopf.append(el("span", "punkte-pill einsatz-pill", zahl(s.einsatz)));
    if (s.ergebnis)
      kopf.append(el("span", `punkte-pill tm-erg tm-${s.ergebnis}`, ERGEBNIS[s.ergebnis]));
    else if (!s.einsatz && z.phase !== "setzen")
      kopf.append(el("span", "punkte-pill", "setzt aus"));
    const reihe = el("div", "karten-reihe");
    kartenSetzen(reihe, s.karten);
    box.append(kopf, reihe);
    sitze.append(box);
  }

  const ich = z.sitze[meinPlatz];
  const meldung = $(".tm-meldung", tisch);
  let text = z.meldung || "";
  if (z.phase === "setzen")
    text = ich?.einsatz
      ? "Einsatz steht – gleich wird gegeben."
      : "Wähle deinen Einsatz und tippe auf Setzen.";
  if (z.phase === "spielen")
    text =
      z.dran === meinPlatz
        ? "Du bist dran: Hit, Stand oder Double?"
        : `Platz ${z.dran + 1} ist dran …`;
  if (z.phase === "ende" && ich?.ergebnis) {
    const netto = ich.auszahlung - ich.einsatz;
    text = `${ERGEBNIS[ich.ergebnis]}${netto > 0 ? ` · +${zahl(netto)}` : netto < 0 ? ` · ${zahl(netto)}` : ""}`;
  }
  meldung.textContent = text;
  meldung.dataset.art =
    z.phase === "ende" && ich?.ergebnis
      ? ich.auszahlung > ich.einsatz
        ? "gewinn"
        : ich.auszahlung === ich.einsatz
          ? "neutral"
          : "verlust"
      : "neutral";

  // Bedienung
  const darfSetzen = z.phase === "setzen" && ich && !ich.einsatz;
  $(".tm-setzen", tisch).disabled = !darfSetzen || kontostand() < CHIPS[0];
  for (const c of tisch.querySelectorAll(".chip"))
    c.disabled = !darfSetzen || Number(c.dataset.wert) > kontostand();
  const binDran = z.phase === "spielen" && z.dran === meinPlatz;
  for (const k of tisch.querySelectorAll(".aktions-knopf")) {
    k.disabled =
      !binDran ||
      (k.dataset.a === "double" && !(ich.karten.length === 2 && kontostand() >= ich.einsatz));
  }
  const geben = $(".tm-geben", tisch);
  geben.hidden = verbindung?.rolle !== "host" || z.phase !== "setzen";
  geben.disabled = !Object.values(z.sitze).some((s) => s.einsatz);

  // Zeitbalken
  const uhr = $(".tm-uhr i", tisch);
  const rest = z.frist ? Math.max(0, z.frist - Date.now()) : 0;
  uhr.style.transition = "none";
  uhr.style.width = rest && z.dauer ? `${(rest / z.dauer) * 100}%` : "0%";
  if (rest) {
    requestAnimationFrame(() => {
      uhr.style.transition = `width ${rest}ms linear`;
      uhr.style.width = "0%";
    });
  }

  buchen(z);
}

/** Eigenes Konto führen: Einsatz abbuchen, wenn bestätigt; am Ende abrechnen. */
function buchen(z) {
  const ich = z.sitze[meinPlatz];
  if (z.runde !== gebuchtRunde) {
    // neue Runde: Rest der alten (z. B. Host weg) gehört schon abgerechnet
    if (gebucht > 0 && abgerechnet !== gebuchtRunde) offenesZurueck();
    gebucht = 0;
    gebuchtRunde = z.runde;
  }
  if (ich && ich.einsatz > gebucht) {
    const diff = ich.einsatz - gebucht;
    if (einsatzAbbuchen(diff)) gebucht += diff;
    walletHudAktualisieren();
  }
  if (z.phase === "ende" && ich?.ergebnis && abgerechnet !== z.runde && gebucht > 0) {
    abgerechnet = z.runde;
    // falls das Konto beim Abbuchen nicht reichte: nur anteilig auszahlen
    const auszahlung =
      gebucht < ich.einsatz ? Math.floor((ich.auszahlung * gebucht) / ich.einsatz) : ich.auszahlung;
    rundeAbschliessen(gebucht, auszahlung);
    const netto = auszahlung - gebucht;
    gebucht = 0;
    walletHudAktualisieren();
    if (netto > 0 && stillEintragen(SPIEL, netto) !== null)
      toplisteAnzeigen($("#topliste"), SPIEL, (p) => `+${zahl(p)}`);
  }
}

/* ---------- Eingaben ---------- */
function eingabe(daten) {
  if (!verbindung) return;
  if (verbindung.rolle === "host") hostEingabe(0, daten);
  else verbindung.raum.senden(daten);
}

$(".tm-setzen", tisch).addEventListener("click", () => {
  if (kontostand() < chip) return;
  eingabe({ t: "setzen", betrag: chip });
});
$(".tm-geben", tisch).addEventListener("click", () => host && austeilen());
for (const k of tisch.querySelectorAll(".aktions-knopf"))
  k.addEventListener("click", () => eingabe({ t: "aktion", a: k.dataset.a }));

document.addEventListener("keydown", (e) => {
  if (document.body.dataset.modus !== "tisch" || e.repeat || e.ctrlKey || e.metaKey || e.altKey)
    return;
  if (e.target instanceof HTMLInputElement) return;
  const a = { h: "hit", s: "stand", d: "double" }[e.key?.toLowerCase()];
  const k = a && tisch.querySelector(`.aktions-knopf[data-a="${a}"]`);
  if (k && !k.disabled) k.click();
});

$(".tisch-verlassen", tisch).addEventListener("click", () => {
  if (verbindung?.rolle === "host") verbindung.raum.schliessen();
  else verbindung?.raum.verlassen();
  const frei =
    verbindung?.rolle === "host" ||
    !letzter ||
    !["austeilen", "spielen", "dealer"].includes(letzter.phase) ||
    !letzter.sitze[meinPlatz]?.einsatz;
  tischEnde(
    frei ? "Du bist aufgestanden." : "Du bist aufgestanden – der Einsatz dieser Runde verfällt.",
    frei,
  );
});
$(".tisch-teilen", tisch).addEventListener("click", async () => {
  const code = verbindung?.code;
  if (!code) return;
  const url = `${location.origin}${location.pathname}?tisch=${code}`;
  try {
    if (navigator.share)
      await navigator.share({
        title: "Blackjack-Tisch",
        text: `Setz dich an meinen Tisch: ${code}`,
        url,
      });
    else {
      await navigator.clipboard.writeText(url);
      status("Link kopiert.");
    }
  } catch {
    status(`Code: ${code}`);
  }
});

/* ============================================================
   HOST: führt das Spiel
   ============================================================ */
let host = null; // { schuh, z, uhr }

function neuerSchuh() {
  let karten = [];
  for (let i = 0; i < DECKS; i++) karten = karten.concat(neuesDeck());
  return mischen(karten);
}

function ziehen() {
  if (host.schuh.length < 30) host.schuh = neuerSchuh();
  return host.schuh.pop();
}

function sicht(z) {
  const verdeckt = z.phase === "spielen" || z.phase === "austeilen";
  return { ...z, dealer: z.dealer.map((k, i) => (verdeckt && i === 1 ? null : k)) };
}

function senden() {
  const s = sicht(host.z);
  verbindung.raum.allen({ t: "zustand", z: s });
  zeigen(s);
}

function uhrStellen(ms, wenn) {
  clearTimeout(host.uhr);
  host.z.frist = ms ? Date.now() + ms : 0;
  host.z.dauer = ms;
  if (ms) host.uhr = setTimeout(wenn, ms);
}

function neueRunde() {
  if (!host) return;
  const z = host.z;
  z.runde++;
  z.phase = "setzen";
  z.dealer = [];
  z.dran = null;
  z.meldung = "";
  for (const s of Object.values(z.sitze))
    Object.assign(s, { einsatz: 0, karten: [], fertig: false, ergebnis: null, auszahlung: 0 });
  uhrStellen(0);
  senden();
}

function sitzNeu() {
  return { einsatz: 0, karten: [], fertig: false, ergebnis: null, auszahlung: 0 };
}

function hostEingabe(platz, d) {
  const z = host?.z;
  const s = z?.sitze[platz];
  if (!s || !d) return;
  if (d.t === "setzen" && z.phase === "setzen" && !s.einsatz && CHIPS.includes(d.betrag)) {
    s.einsatz = d.betrag;
    if (!z.frist) uhrStellen(GEBEN_NACH_MS, austeilen);
    const alle = Object.values(z.sitze).every((x) => x.einsatz);
    if (alle) austeilen();
    else senden();
  } else if (d.t === "aktion" && z.phase === "spielen" && z.dran === platz) {
    if (d.a === "hit") {
      s.karten.push(ziehen());
      if (handWert(s.karten).summe >= 21) s.fertig = true;
    } else if (d.a === "stand") s.fertig = true;
    else if (d.a === "double" && s.karten.length === 2) {
      s.einsatz *= 2;
      s.karten.push(ziehen());
      s.fertig = true;
    } else return;
    weiter();
  }
}

function austeilen() {
  const z = host.z;
  if (z.phase !== "setzen") return;
  const spieler = Object.values(z.sitze).filter((s) => s.einsatz);
  if (!spieler.length) return uhrStellen(0);
  z.phase = "austeilen";
  uhrStellen(0);
  z.dealer = [ziehen(), ziehen()];
  for (const s of spieler) {
    s.karten = [ziehen(), ziehen()];
    s.fertig = handWert(s.karten).blackjack;
  }
  z.phase = "spielen";
  if (handWert(z.dealer).blackjack) for (const s of spieler) s.fertig = true; // Dealer-Blackjack: sofort auflösen
  weiter();
}

function weiter() {
  const z = host.z;
  const offen = Object.keys(z.sitze)
    .map(Number)
    .sort((a, b) => a - b)
    .find((p) => z.sitze[p].einsatz && !z.sitze[p].fertig);
  if (offen === undefined) return dealerSpielt();
  z.dran = offen;
  uhrStellen(ZUG_MS, () => {
    if (host?.z.phase === "spielen" && host.z.dran === offen) {
      z.sitze[offen].fertig = true; // Zeit abgelaufen → automatisch Stand
      weiter();
    }
  });
  senden();
}

async function dealerSpielt() {
  const z = host.z;
  z.phase = "dealer";
  z.dran = null;
  uhrStellen(0);
  senden();
  const imSpiel = Object.values(z.sitze).filter((s) => s.einsatz);
  const brauchtDealer = imSpiel.some(
    (s) => !handWert(s.karten).ueberkauft && !handWert(s.karten).blackjack,
  );
  while (brauchtDealer && dealerMussZiehen(z.dealer)) {
    await warte(DEALER_MS);
    if (!host) return;
    z.dealer.push(ziehen());
    senden();
  }
  await warte(DEALER_MS);
  if (!host) return;
  for (const s of imSpiel) Object.assign(s, rundeAuswerten(s.karten, z.dealer, s.einsatz));
  z.phase = "ende";
  uhrStellen(PAUSE_ENDE_MS, neueRunde);
  senden();
}

async function eroeffnen() {
  status("Tisch wird eröffnet …");
  modusZeigen("tisch");
  try {
    const raum = await raumEroeffnen(SPIEL, {
      gast(platz) {
        if (!host) return;
        host.z.sitze[platz] ??= sitzNeu();
        status(`Platz ${platz + 1} hat sich gesetzt.`);
        senden();
      },
      gastWeg(platz) {
        if (!host) return;
        const z = host.z;
        delete z.sitze[platz];
        status(`Platz ${platz + 1} ist aufgestanden.`);
        if (z.phase === "spielen" && z.dran === platz) weiter();
        else senden();
      },
      nachricht: (platz, d) => hostEingabe(platz, d),
      status,
    });
    verbindung = { rolle: "host", raum, code: raum.code };
    meinPlatz = 0;
    host = {
      schuh: neuerSchuh(),
      uhr: null,
      z: {
        runde: 0,
        phase: "setzen",
        sitze: { 0: sitzNeu() },
        dealer: [],
        dran: null,
        frist: 0,
        dauer: 0,
        meldung: "",
      },
    };
    status(`Tisch offen. Gib deinen Mitspielern den Code ${raum.code}.`);
    neueRunde();
    modusZeigen("tisch");
  } catch (err) {
    tischEnde(err.message || "Tisch konnte nicht eröffnet werden.");
  }
}

/* ============================================================
   GAST
   ============================================================ */
async function beitreten(code) {
  status("Verbinde …");
  try {
    const raum = await raumBeitreten(SPIEL, code, {
      verbunden: () => status("Du sitzt am Tisch."),
      nachricht(d) {
        if (d?.t === "zustand" && d.z) zeigen(d.z);
      },
      status,
      ende: (grund) => tischEnde(grund || "Der Tisch wurde geschlossen."),
    });
    verbindung = { rolle: "gast", raum, code: raum.code };
    meinPlatz = raum.platz;
    modusZeigen("tisch");
    zeigen({
      runde: -1,
      phase: "warten",
      sitze: {},
      dealer: [],
      dran: null,
      frist: 0,
      dauer: 0,
      meldung: "Warte auf den Host …",
    });
  } catch (err) {
    modusZeigen("beitreten");
    const p =
      beitrittBox.querySelector(".tisch-fehler") ||
      beitrittBox.appendChild(el("p", "tisch-fehler"));
    p.textContent = err.message || "Beitreten hat nicht geklappt.";
  }
}

kAllein.addEventListener("click", () => {
  if (!verbindung) modusZeigen("allein");
});
kEroeffnen.addEventListener("click", () => !verbindung && eroeffnen());
kBeitreten.addEventListener("click", () => {
  if (verbindung) return;
  modusZeigen("beitreten");
  beitrittBox.elements.code.focus();
});
beitrittBox.addEventListener("submit", (e) => {
  e.preventDefault();
  beitreten(beitrittBox.elements.code.value);
});

window.addEventListener("pagehide", () => {
  // Seite weg: offenen Einsatz zurück (sonst wäre er verloren)
  // Host weg = Tisch endet → wie bei allen anderen geht der eigene Einsatz zurück
  if (verbindung?.rolle === "host" && letzter && letzter.phase !== "ende") offenesZurueck();
});

// Einladungslink ?tisch=CODE
const eingeladen = new URLSearchParams(location.search).get("tisch");
if (eingeladen) {
  modusZeigen("beitreten");
  beitrittBox.elements.code.value = eingeladen.toUpperCase().slice(0, 4);
}
