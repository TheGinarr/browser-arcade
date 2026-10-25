/* ============================================================
   startseite.js · Weltweite Liste "Höchstes Level" / "Längste Serie"
   (Werte aus fortschritt.js, + Löschknopf über bestenliste.js)
   ============================================================ */

import { holen, melden } from "./bestenliste.js";
import { lade } from "./storage.js";

const box = document.getElementById("spieler-welt");
if (box) {
  const ul = box.querySelector(".topliste");
  const fuss = box.querySelector(".topliste-fuss");
  const knoepfe = [...box.querySelectorAll("[data-liste]")];
  const EINHEIT = {
    "spieler-level": (n) => `Level ${zahl(n)}`,
    "spieler-serie": (n) => `${zahl(n)} ${n === 1 ? "Tag" : "Tage"}`,
  };
  const zahl = (n) => Number(n).toLocaleString("de-DE");
  let aktiv = "spieler-level";
  const zeichnen = (liste, d) => {
    if (liste !== aktiv) return;
    const fmt = EINHEIT[liste];
    ul.innerHTML = "";
    if (!d) {
      fuss.textContent = "Die weltweite Liste ist gerade nicht erreichbar.";
      return;
    }
    if (d.top.length === 0) {
      const li = document.createElement("li");
      li.className = "leer";
      li.textContent = "Noch keine Einträge – sei die/der Erste!";
      ul.append(li);
    }
    d.top.forEach((e, i) => {
      const li = document.createElement("li");
      if (e.du) li.classList.add("neu", "du");
      for (const [klasse, text] of [
        ["platz", `${i + 1}.`],
        ["name", e.initialen],
        ["punkte", fmt(e.punkte)],
      ]) {
        const s = document.createElement("span");
        s.className = klasse;
        s.textContent = text;
        li.append(s);
      }
      ul.append(li);
    });
    fuss.textContent = d.eigen
      ? `Du: ${fmt(d.eigen.punkte)} (Platz ${d.eigen.platz} von ${d.anzahl})`
      : "";
  };
  const laden = (liste, frisch = false) => holen(liste, frisch).then((d) => zeichnen(liste, d));
  for (const k of knoepfe)
    k.addEventListener("click", () => {
      aktiv = k.dataset.liste;
      knoepfe.forEach((x) => x.setAttribute("aria-pressed", String(x === k)));
      laden(aktiv);
    });
  // eigene Werte melden (nur wenn besser als zuletzt gemeldet), dann Liste frisch laden
  const d = lade("fortschritt", "daten", null);
  if (d && typeof d === "object") {
    const kuerzel = String(lade("global", "initialen", "")).slice(0, 3) || "???";
    const level = FS_level(d.ep);
    if (level > 1) melden("spieler-level", level, kuerzel);
    if ((d.serie?.beste || 0) >= 1) melden("spieler-serie", d.serie.beste, kuerzel);
  }
  laden(aktiv);
  window.addEventListener(
    "bestenliste",
    (e) => e.detail?.spiel === aktiv && zeichnen(aktiv, e.detail.daten),
  );
}
function FS_level(ep) {
  return FS.levelAus(Number(ep) || 0).level;
}

/* ============================================================
   Dein Fortschritt: Spieler-Level, Tagesaufgaben, Weiterspielen,
   Abzeichen-Sammlung (alles lokal, siehe fortschritt.js)
   ============================================================ */
import * as FS from "./fortschritt.js";

const STUFE = ["", "Bronze", "Silber", "Gold"];
const zahlDe = (n) => Number(n).toLocaleString("de-DE");
const mk = (tag, klasse, text) => {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
};
const kachel = (s) => document.querySelector(`a.karte[href="${s}/"]`);

// NEU-Marker: 14 Tage ab data-neu
for (const k of document.querySelectorAll(".karte[data-neu]")) {
  const alter = (Date.now() - Date.parse(k.dataset.neu + "T00:00:00")) / 864e5;
  if (alter >= 0 && alter < 14) k.classList.add("ist-neu");
}

function ring(u) {
  const r = 31,
    umfang = 2 * Math.PI * r;
  const d = mk("div", "fs-ring");
  d.innerHTML = `<svg viewBox="0 0 72 72" aria-hidden="true"><defs><linearGradient id="fs-verlauf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs>
    <circle class="spur" cx="36" cy="36" r="${r}" fill="none" stroke-width="7"/>
    <circle class="wert" cx="36" cy="36" r="${r}" fill="none" stroke-width="7"/></svg>`;
  const w = d.querySelector(".wert");
  w.style.setProperty("--u", umfang.toFixed(1));
  w.style.setProperty("--anteil", u.anteil.toFixed(3));
  d.append(mk("b", "", u.level), mk("small", "", "LEVEL"));
  return d;
}
const FLAMME = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1c1 3 4 4.5 4 8.2A4 4 0 0 1 4 9.5C4 7.6 5.2 6.6 6 5.3 6.4 6.6 7 7 7.6 7.2 7.4 5 7.6 3 8 1z" fill="#ff8a3d"/><path d="M8 8c.6 1.4 2 2 2 3.4a2 2 0 0 1-4 0c0-1 .6-1.6 1-2.2.3.6.6.8 1 .9z" fill="#ffd34d"/></svg>`;
const STERN = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l2 4.3 4.6.5-3.4 3.1 1 4.6L8 11.7 3.8 14l1-4.6L1.4 6.3 6 5.8z" fill="#ffd34d"/></svg>`;
const MEDAILLE = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="10" r="5" fill="#ffd34d" stroke="#a8740a"/><path d="M5 1h2.4L8 5 5.6 5zM11 1H8.6L8 5l2.4 0z" fill="#ff4fa3"/></svg>`;

function spielerBox(u) {
  const box = mk("div", "fs-box fs-spieler");
  const txt = mk("div");
  txt.append(mk("p", "fs-name", u.rang));
  txt.append(
    mk(
      "p",
      "fs-text",
      `${zahlDe(u.ep)} EP · noch ${zahlDe(u.noetig - u.rest)} bis Level ${u.level + 1}`,
    ),
  );
  const chips = mk("div", "fs-chips");
  const fl = mk("span", `fs-chip flamme${u.serie ? "" : " aus"}`);
  fl.innerHTML = FLAMME;
  fl.append(u.serie ? `${u.serie} ${u.serie === 1 ? "Tag" : "Tage"} Serie` : "Serie starten");
  chips.append(fl);
  if (u.faktor > 1) {
    const b = mk("span", "fs-chip");
    b.innerHTML = STERN;
    b.append(`EP +${Math.round((u.faktor - 1) * 100)} %`);
    b.title = "Serienbonus: +10 % EP je Serientag (bis +100 %)";
    chips.append(b);
  }
  const geholt = u.abzeichen.reduce((s, a) => s + a.stufe, 0);
  const m = mk("span", "fs-chip");
  m.innerHTML = MEDAILLE;
  m.append(`${geholt}/${u.abzeichen.length * 3} Abzeichen`);
  chips.append(m);
  txt.append(chips);
  box.append(ring(u), txt);
  return box;
}

function restBisMitternacht() {
  const j = new Date(),
    m = new Date(j);
  m.setHours(24, 0, 0, 0);
  const min = Math.ceil((m - j) / 6e4);
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h`;
}

function aufgabenBox(u) {
  const box = mk("div", "fs-box");
  const h = mk("h3", "", "Tagesaufgaben");
  const uhr = mk("span", "fs-klein");
  uhr.append("neue in ", mk("span", "fs-uhr", restBisMitternacht()));
  h.append(uhr);
  box.append(h);
  const ul = mk("ul", "fs-aufgaben");
  const standard = u.zuletzt.find((s) => kachel(s)) || "snake";
  for (const a of u.aufgaben) {
    const li = mk("li");
    const ziel = a.link || (a.art === "sterne" ? "waesche" : standard);
    const row = mk(
      a.fertig ? "div" : "a",
      `fs-aufgabe${a.fertig ? " fertig" : ""}${!a.fertig && a.stand / a.ziel >= 0.6 ? " fast" : ""}`,
    );
    if (!a.fertig) row.href = `${ziel}/`;
    const haken = mk("span", "fs-haken", a.fertig ? "✓" : `${a.stand}/${a.ziel}`);
    const mitte = mk("span");
    mitte.append(mk("span", "fs-a-text", a.text));
    const bal = mk("span", "fs-a-balken");
    const i = mk("i");
    i.style.setProperty("--a", (a.stand / a.ziel).toFixed(3));
    bal.append(i);
    mitte.append(bal);
    row.append(haken, mitte, mk("span", "fs-a-los", a.fertig ? "+40 EP" : "Los ›"));
    row.setAttribute(
      "aria-label",
      `${a.text}: ${a.fertig ? "erledigt" : `${a.stand} von ${a.ziel}`}`,
    );
    li.append(row);
    ul.append(li);
  }
  box.append(ul);
  const lohn = mk("p", "fs-lohn");
  lohn.innerHTML =
    "Je Aufgabe <b>+40 EP</b>, alle drei <b>+100 EP</b> extra. Jeder Serientag gibt +10 % auf alle EP.";
  box.append(lohn);
  if (u.serieLetzterTag) {
    box.append(
      mk(
        "p",
        "fs-warn",
        `Letzter Schontag: Erledige heute eine Aufgabe, sonst beginnt deine ${u.serie}-Tage-Serie (EP +${Math.round((u.faktor - 1) * 100)} %) von vorn.`,
      ),
    );
  } else if (u.serie > 0 && !u.serieHeute) {
    box.append(
      mk(
        "p",
        "fs-warn",
        `Deine Serie steht bei ${u.serie} ${u.serie === 1 ? "Tag" : "Tagen"} – eine Aufgabe heute macht ${u.serie + 1} daraus.`,
      ),
    );
  }
  return box;
}

function kurzZiel(a) {
  if (!a) return "";
  if (a.naechste == null) return "Gold geholt!";
  const st = STUFE[a.stufe + 1];
  if (a.text) return `${st}: ${a.text[a.stufe]}`;
  return `noch ${zahlDe(a.naechste - a.wertJetzt)} ${a.einheit} bis ${st}`;
}

function weiterBox(u) {
  const liste = u.zuletzt
    .map((s) => [s, kachel(s)])
    .filter(([, k]) => k)
    .slice(0, 4);
  if (!liste.length) return null;
  const box = mk("div", "fs-box fs-breit");
  box.append(mk("h3", "", "Weiterspielen"));
  const reihe = mk("div", "fs-weiter");
  for (const [s, k] of liste) {
    const a = mk("a", "fs-w");
    a.href = `${s}/`;
    const kat = k.style.getPropertyValue("--kat");
    if (kat) a.style.setProperty("--kat", kat);
    const ic = mk("span", "fs-w-icon");
    const svg = k.querySelector(".karte-icon svg");
    if (svg) ic.append(svg.cloneNode(true));
    a.append(
      ic,
      mk("b", "", k.querySelector("h3")?.textContent.trim() || s),
      mk("small", "", kurzZiel(FS.abzeichenZuPfad(s)) || "Weiter geht's"),
    );
    reihe.append(a);
  }
  box.append(reihe);
  return box;
}

function sammlungBox(u) {
  const box = mk("details", "fs-box fs-breit fs-sammlung");
  const sum = mk("summary");
  const h = mk("h3", "", "Abzeichen");
  const geholt = u.abzeichen.reduce((s, a) => s + a.stufe, 0),
    max = u.abzeichen.length * 3;
  h.append(mk("span", "fs-klein", `${geholt} von ${max}`));
  const bal = mk("span", "fs-a-balken");
  const i = mk("i");
  i.style.setProperty("--a", (geholt / max).toFixed(3));
  bal.append(i);
  sum.append(h, mk("span", "fs-pfeil", "›"), bal);
  box.append(sum);
  const raster = mk("div", "fs-medaillen");
  for (const a of u.abzeichen) {
    const m = mk("div", `fs-medaille stufe-${a.stufe}`);
    m.append(
      FS.medaille(a.stufe, 44),
      mk("b", "", a.name),
      mk(
        "small",
        "",
        a.stufe ? `${STUFE[a.stufe]}${a.naechste == null ? "" : ` · ${kurzZiel(a)}`}` : kurzZiel(a),
      ),
    );
    m.setAttribute(
      "aria-label",
      `${a.name}: ${a.stufe ? STUFE[a.stufe] : "noch offen"}. ${kurzZiel(a)}`,
    );
    raster.append(m);
  }
  box.append(raster);
  return box;
}

const bereich = document.getElementById("fortschritt");
function fortschrittZeichnen() {
  if (!bereich) return;
  const u = FS.uebersicht();
  const raster = mk("div", "fs-raster");
  raster.append(spielerBox(u), aufgabenBox(u));
  const w = weiterBox(u);
  if (w) raster.append(w);
  raster.append(sammlungBox(u));
  const offen = bereich.querySelector(".fs-sammlung")?.open;
  bereich.replaceChildren(raster);
  if (offen) bereich.querySelector(".fs-sammlung").open = true;
  bereich.hidden = false;
}
try {
  FS.begruessen();
  fortschrittZeichnen();
  setInterval(() => {
    const u = bereich?.querySelector(".fs-uhr");
    if (u) u.textContent = restBisMitternacht();
  }, 30000);
  // Zurück aus einem Spiel (bfcache) → frisch zeichnen
  window.addEventListener("pageshow", (e) => e.persisted && fortschrittZeichnen());
} catch (e) {
  console.warn("Fortschritt:", e);
}
