"use client";

// Hela appen är en sida med flera "skärmar": login → välj barn → hem → fota → förhör.
// Förhören sparas i webbläsaren på den enhet barnet använder (localStorage).

import { useEffect, useState } from "react";
import { BARN, hittaBarn } from "../lib/barn";
import { TYPER, SPRAK, STANDARD_AMNEN, sprakNamn } from "../lib/amnen";
import { arDemo } from "../lib/demo";
import { npForBarn } from "../lib/np";
import { NIVAER, nivaNamn } from "../lib/niva";
import { lasFil, FIL_ACCEPT } from "../lib/filer";
import { dagensUttryck, slumpa, PEPP_RATT, PEPP_FEL } from "../lib/koreanska";
import { DJUR, KLISTER, SPELARE, MARKEN, WIKI_TITEL, KLUBB_WIKI, tomBelo, dagarIRad, belona } from "../lib/belo";

function lasLagrat(nyckel, standard) {
  try {
    const v = localStorage.getItem(nyckel);
    return v ? JSON.parse(v) : standard;
  } catch {
    return standard;
  }
}
function sparaLagrat(nyckel, varde) {
  try {
    localStorage.setItem(nyckel, JSON.stringify(varde));
  } catch {}
}

// Krymper fotot innan det skickas: billigare, snabbare och under Vercels storleksgräns.
function krympBild(fil, maxSida = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, maxSida / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * skala);
      canvas.height = Math.round(img.height * skala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(fil);
  });
}

// Gör en liten bild (för spelarkort och klubbmärke) som sparas i webbläsaren.
function litenBild(fil, maxSida = 260, format = "image/jpeg") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, maxSida / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * skala);
      c.height = Math.round(img.height * skala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL(format, 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(fil);
  });
}

// Hämtar spelarbilder och klubbmärke automatiskt från Wikipedia i barnets webbläsare.
// Inget sparas i repot. Resultatet sparas i webbläsaren en vecka.
async function hamtaWikiBilder() {
  const cache = lasLagrat("wikibilder", null);
  if (cache && Date.now() - cache.tid < 7 * 86400000) return cache.data;
  const titlar = [KLUBB_WIKI, ...SPELARE.map(([namn]) => WIKI_TITEL[namn] || namn)];
  const tillTitel = {}; // wikititel -> vårt namn
  SPELARE.forEach(([namn]) => { tillTitel[WIKI_TITEL[namn] || namn] = namn; });
  const data = { logo: "", spelare: {} };
  for (let i = 0; i < titlar.length; i += 10) {
    const grupp = titlar.slice(i, i + 10);
    const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=320&pilicense=any&titles=" + encodeURIComponent(grupp.join("|"));
    const r = await fetch(url);
    if (!r.ok) continue;
    const j = await r.json();
    const omvand = {}; // slutlig titel -> efterfrågad titel
    for (const t of grupp) omvand[t] = t;
    for (const n of j.query?.normalized || []) omvand[n.to] = omvand[n.from] || n.from;
    for (const n of j.query?.redirects || []) omvand[n.to] = omvand[n.from] || n.from;
    for (const sida of Object.values(j.query?.pages || {})) {
      const bild = sida.thumbnail?.source;
      if (!bild) continue;
      const fraga = omvand[sida.title] || sida.title;
      if (fraga === KLUBB_WIKI) data.logo = bild;
      else if (tillTitel[fraga]) data.spelare[tillTitel[fraga]] = bild;
    }
  }
  sparaLagrat("wikibilder", { tid: Date.now(), data });
  return data;
}

function lasUpp(text, sprak = "sv-SE") {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = sprak || "sv-SE";
    const rost = window.speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(u.lang.slice(0, 2)));
    if (rost) u.voice = rost;
    u.rate = sprak && sprak !== "sv-SE" ? 0.75 : 0.85; // lugnt tempo så att det hinns med
    window.speechSynthesis.speak(u);
  } catch {}
}

// Taligenkänning i webbläsaren (Chrome, Edge och Safari). Ger tillbaka det barnet sa.
function taligenkanningFinns() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function lyssnaPa(sprak = "sv-SE") {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error("Din webbläsare kan inte lyssna. Prova Chrome eller Safari."));
    const r = new SR();
    r.lang = sprak || "sv-SE";
    r.interimResults = false;
    r.maxAlternatives = 3;
    let klar = false;
    r.onresult = (e) => {
      klar = true;
      resolve(Array.from(e.results[0]).map((a) => a.transcript));
    };
    r.onerror = (e) => { klar = true; reject(new Error(e.error === "not-allowed" ? "Tillåt mikrofonen för att kunna prata in svaret." : "Jag hörde inget. Försök igen.")); };
    r.onend = () => { if (!klar) reject(new Error("Jag hörde inget. Försök igen.")); };
    try { window.speechSynthesis.cancel(); } catch {}
    r.start();
  });
}

// Egen tecknad capybara till Ediths sida: knubbig, tjocka konturer, lång nos.
function Capybara({ storlek = 120, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 120 112" width={storlek} height={storlek * 112 / 120} aria-hidden="true">
      <ellipse cx="60" cy="107" rx="44" ry="4" fill="#5B3A24" opacity="0.12" />
      <g stroke="#5B3A24" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M14 78 C14 56 30 46 60 46 C90 46 106 56 106 78 C106 96 94 104 60 104 C26 104 14 96 14 78 Z" fill="#D9A066" />
        <path d="M38 12 a5 5 0 0 1 9 -3" fill="#C98A50" />
        <path d="M73 9 a5 5 0 0 1 9 3" fill="#C98A50" />
        <path d="M36 26 C36 14 44 9 60 9 C76 9 84 14 84 26 L86 58 C86 70 76 76 60 76 C44 76 34 70 34 58 Z" fill="#D9A066" />
        <path d="M55 52 v6 M65 52 v6" fill="none" />
        <path d="M44 86 q-1 7 5 8 M76 86 q1 7 -5 8" fill="none" />
        <path d="M30 103 q6 -7 14 0 M76 103 q6 -7 14 0" fill="#C98A50" />
      </g>
      <ellipse cx="46" cy="30" rx="2.6" ry="3.4" fill="#3B2416" />
      <ellipse cx="74" cy="30" rx="2.6" ry="3.4" fill="#3B2416" />
      <ellipse cx="42" cy="44" rx="5" ry="3" fill="#F29B7A" opacity="0.5" />
      <ellipse cx="78" cy="44" rx="5" ry="3" fill="#F29B7A" opacity="0.5" />
    </svg>
  );
}

function Ljusstav() {
  return (
    <svg className="tema-bild" viewBox="0 0 80 110" width="70" height="96" aria-hidden="true">
      <defs>
        <radialGradient id="glod" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#fff" /><stop offset="0.5" stopColor="#F9A8D4" /><stop offset="1" stopColor="#C084FC" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="34" r="30" fill="#F0ABFC" opacity="0.35" />
      <circle cx="40" cy="34" r="22" fill="url(#glod)" stroke="#fff" strokeWidth="3" />
      <path d="M40 22 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#fff" />
      <rect x="34" y="56" width="12" height="46" rx="6" fill="#fff" />
      <rect x="34" y="70" width="12" height="6" fill="#E879F9" />
    </svg>
  );
}

function Pompom() {
  const tofs = (cx, cy, farg) => (
    <g>
      {Array.from({ length: 14 }).map((_, i) => {
        const v = (i / 14) * Math.PI * 2;
        return <path key={i} d={`M${cx} ${cy} L${cx + Math.cos(v) * 26} ${cy + Math.sin(v) * 26}`} stroke={farg} strokeWidth="7" strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r="12" fill={farg} />
    </g>
  );
  return (
    <svg className="tema-bild" viewBox="0 0 120 90" width="110" height="82" aria-hidden="true">
      {tofs(38, 42, "#F472B6")}
      {tofs(82, 48, "#fff")}
    </svg>
  );
}

function Vinyl({ namn }) {
  return (
    <svg className="tema-bild" viewBox="0 0 110 110" width="96" height="96" aria-hidden="true">
      <circle cx="55" cy="55" r="50" fill="#1F1235" />
      {[42, 34, 26].map((r) => <circle key={r} cx="55" cy="55" r={r} fill="none" stroke="#3B2A5C" strokeWidth="1.5" />)}
      <circle cx="55" cy="55" r="16" fill="#F0ABFC" />
      <circle cx="55" cy="55" r="3" fill="#1F1235" />
      <path d="M90 18 v22 a6 6 0 1 1 -3 -5 V22 l10 -3 v5z" fill="#FDE68A" />
    </svg>
  );
}

// Vänskapsarmband med barnets namn i pärlor.
function Armband({ text }) {
  const farger = ["#F9A8D4", "#C4B5FD", "#FDE68A", "#A5F3FC", "#FBCFE8"];
  return (
    <div className="armband" aria-label={`Armband: ${text}`}>
      {text.toUpperCase().split("").map((b, i) => (
        <span key={i} className="parla bokstav">{b}</span>
      )).reduce((acc, el, i) => [...acc, <span key={`p${i}`} className="parla" style={{ background: farger[i % farger.length] }} />, el], [])}
      <span className="parla" style={{ background: farger[0] }} />
    </div>
  );
}

function FotbollIkon() {
  return (
    <svg className="fotboll" viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#fff" stroke="#1F2937" strokeWidth="2" />
      <path d="M24 13 L32 19 L29 29 L19 29 L16 19 Z" fill="#1F2937" />
      <path d="M24 13 V4 M32 19 L42 15 M29 29 L35 38 M19 29 L13 38 M16 19 L6 15" stroke="#1F2937" strokeWidth="2" />
    </svg>
  );
}

function MikIkon({ storlek = 18 }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v4" />
    </svg>
  );
}

function normalisera(s) {
  return String(s || "").toLowerCase().trim().replace(/[.!?,;:"']/g, "").replace(/\s+/g, " ");
}

export default function App() {
  const [kod, setKod] = useState(null); // familjekoden, null = inte inloggad än
  const [laddat, setLaddat] = useState(false);
  const [barnId, setBarnId] = useState(null);
  const [skarm, setSkarm] = useState("valj");
  const [material, setMaterial] = useState([]);
  const [aktivt, setAktivt] = useState(null); // förhöret som körs
  const [amnen, setAmnen] = useState(STANDARD_AMNEN);
  const [belo, setBelo] = useState(tomBelo());
  const [bilder, setBilder] = useState({ logo: "", spelare: {} }); // egna bilder, bara på den här enheten
  const [wiki, setWiki] = useState({ logo: "", spelare: {} });
  const [prov, setProv] = useState([]); // barnets provschema
  const [startProv, setStartProv] = useState(null); // prov som barnet vill träna inför
  const demo = arDemo(kod);
  const prefix = demo ? "demo-" : ""; // testläget sparar separat från barnens riktiga förhör

  useEffect(() => {
    setKod(lasLagrat("familjekod", null));
    setLaddat(true);
  }, []);

  useEffect(() => {
    if (barnId) {
      setMaterial(lasLagrat(`${prefix}material-${barnId}`, []));
      setAmnen(lasLagrat(`${prefix}amnen-${barnId}`, STANDARD_AMNEN));
      setBelo(lasLagrat(`${prefix}belo-${barnId}`, tomBelo()));
      setProv(lasLagrat(`${prefix}prov-${barnId}`, []));
      setBilder(lasLagrat(`bilder-${barnId}`, { logo: "", spelare: {} }));
    }
  }, [barnId, prefix]);

  // Ger barnet en belöning efter ett avklarat förhör eller kortpass.
  function geBelöning(andel) {
    const b = hittaBarn(barnId);
    const { belo: ny, vinst } = belona(belo, b?.belo || "dagar", andel);
    setBelo(ny);
    sparaLagrat(`${prefix}belo-${barnId}`, ny);
    return vinst;
  }

  // Barnets tema (t.ex. Ediths capybara-känsla) sätts på hela sidan.
  useEffect(() => {
    const b = barnId ? hittaBarn(barnId) : null;
    document.body.dataset.tema = b?.tema || "";
  }, [barnId]);

  useEffect(() => {
    const b = barnId ? hittaBarn(barnId) : null;
    if (b?.belo === "fotboll") hamtaWikiBilder().then(setWiki).catch(() => {});
  }, [barnId]);

  // Egna bilder går före Wikipedias.
  const allaBilder = {
    logo: bilder.logo || wiki.logo,
    spelare: { ...wiki.spelare, ...(bilder.spelare || {}) },
  };

  function uppdateraProv(lista) {
    setProv(lista);
    sparaLagrat(`${prefix}prov-${barnId}`, lista);
  }

  function uppdateraBilder(ny) {
    setBilder(ny);
    try {
      localStorage.setItem(`bilder-${barnId}`, JSON.stringify(ny));
    } catch {
      alert("Mobilen har inte plats för fler bilder. Ta bort några först.");
    }
  }

  function uppdateraAmnen(lista) {
    setAmnen(lista);
    sparaLagrat(`${prefix}amnen-${barnId}`, lista);
  }

  function uppdateraMaterial(lista) {
    setMaterial(lista);
    sparaLagrat(`${prefix}material-${barnId}`, lista);
  }

  if (!laddat) return null;
  if (kod && demo) {
    return (
      <>
        <div className="testband">Testläge: fasta exempelfrågor, inga krediter används</div>
        {innehall()}
      </>
    );
  }
  return innehall();

  function innehall() {
  if (!kod) return <Login onKlar={(k) => { sparaLagrat("familjekod", k); setKod(k); }} />;

  const barn = barnId ? hittaBarn(barnId) : null;

  if (!barn || skarm === "valj") {
    return (
      <Valj
        onVal={(id) => { setBarnId(id); setSkarm("hem"); }}
        onLoggaUt={() => { sparaLagrat("familjekod", null); setKod(null); }}
      />
    );
  }

  if (skarm === "prov") {
    return <Provschema barn={barn} amnen={amnen} prov={prov} onSpara={uppdateraProv} onTillbaka={() => setSkarm("hem")} />;
  }

  if (skarm === "fota") {
    return (
      <Fota
        barn={barn}
        startProv={startProv}
        kod={kod}
        amnen={amnen}
        onNyttAmne={(a) => uppdateraAmnen([...amnen, a])}
        onTillbaka={() => setSkarm("hem")}
        onKlar={(nytt) => {
          uppdateraMaterial([nytt, ...material]);
          setAktivt(nytt);
          setSkarm("forhor");
        }}
        onFelKod={() => { sparaLagrat("familjekod", null); setKod(null); }}
      />
    );
  }

  if (skarm === "forhor" && aktivt) {
    return (
      <Forhor
        barn={barn}
        forhor={aktivt}
        kod={kod}
        bilder={allaBilder}
        onBelona={geBelöning}
        onKlar={(resultat) => {
          const lista = material.map((m) =>
            m.id === aktivt.id ? { ...m, senast: { ...resultat, datum: new Date().toISOString() } } : m
          );
          uppdateraMaterial(lista);
          setSkarm("hem");
        }}
        onAvbryt={() => setSkarm("hem")}
      />
    );
  }

  if (skarm === "kort" && aktivt) {
    return <Bladdrakort barn={barn} forhor={aktivt} bilder={allaBilder} onBelona={geBelöning} onKlar={() => setSkarm("hem")} />;
  }

  if (skarm === "belo") {
    return <Beloningar barn={barn} belo={belo} bilder={allaBilder} egna={bilder} onBilder={uppdateraBilder} onTillbaka={() => setSkarm("hem")} />;
  }

  if (skarm === "np") {
    return (
      <NationellaProv
        barn={barn}
        kod={kod}
        onTillbaka={() => setSkarm("hem")}
        onKlar={(nytt) => {
          uppdateraMaterial([nytt, ...material]);
          setAktivt(nytt);
          setSkarm("forhor");
        }}
        onFelKod={() => { sparaLagrat("familjekod", null); setKod(null); }}
      />
    );
  }

  if (skarm === "amnen") {
    return (
      <Amnen
        barn={barn}
        amnen={amnen}
        onTillbaka={() => setSkarm("hem")}
        onLaggTill={(a) => uppdateraAmnen([...amnen, a])}
        onTaBort={(id) => uppdateraAmnen(amnen.filter((a) => a.id !== id))}
      />
    );
  }

  return (
    <Hem
      barn={barn}
      material={material}
      onAmnen={() => setSkarm("amnen")}
      onNp={() => setSkarm("np")}
      belo={belo}
      bilder={allaBilder}
      onBelo={() => setSkarm("belo")}
      onKort={(m) => { setAktivt(m); setSkarm("kort"); }}
      onByt={() => setSkarm("valj")}
      onFota={() => { setStartProv(null); setSkarm("fota"); }}
      prov={prov}
      onProvschema={() => setSkarm("prov")}
      onTranaProv={(p) => { setStartProv(p); setSkarm("fota"); }}
      onStarta={(m) => { setAktivt(m); setSkarm("forhor"); }}
      onTaBort={(id) => uppdateraMaterial(material.filter((m) => m.id !== id))}
    />
  );
}
}

function Login({ onKlar }) {
  const [text, setText] = useState("");
  const [fel, setFel] = useState("");
  const [vantar, setVantar] = useState(false);

  async function skicka(e) {
    e.preventDefault();
    setVantar(true);
    setFel("");
    const r = await fetch("/api/kolla", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kod: text.trim() }),
    }).catch(() => null);
    setVantar(false);
    if (r && r.ok) return onKlar(text.trim());
    const data = r ? await r.json().catch(() => ({})) : {};
    setFel(data.fel || (r ? "Fel kod. Fråga mamma eller pappa." : "Ingen kontakt med servern."));
  }

  return (
    <main className="app">
      <form className="sida" onSubmit={skicka} style={{ justifyContent: "center" }}>
        <p className="liten-rubrik">Läxhjälpen</p>
        <h1>Skriv familjekoden</h1>
        <label className="etikett">
          Familjekod
          <input className="falt" type="password" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </label>
        {fel && <p className="fel">{fel}</p>}
        <button className="knapp" disabled={!text || vantar}>Logga in</button>
        <p className="dov">Koden behövs bara första gången på varje mobil eller dator.</p>
      </form>
    </main>
  );
}

function Valj({ onVal, onLoggaUt }) {
  return (
    <main className="app bred">
      <div className="sida">
        <p className="liten-rubrik">Läxhjälpen</p>
        <h1>Vem tränar idag?</h1>
        <div className="barnlista">
        {BARN.map((b) => (
          <button key={b.id} className="barnknapp" style={{ borderColor: b.ljus }} onClick={() => onVal(b.id)}>
            <span className="avatar" style={{ background: b.farg }}>{b.namn[0]}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 19, fontWeight: 800 }}>{b.namn}</span>
              <span className="dov">{b.info}</span>
            </span>
          </button>
        ))}
        </div>
        <button className="tabort" onClick={onLoggaUt}>Logga ut den här enheten</button>
      </div>
    </main>
  );
}

function amnesEtikett(m) {
  return m.amneNamn || m.amne || "Övrigt";
}

function Hem({ barn, material, onByt, onFota, onStarta, onTaBort, onAmnen, onNp, belo, bilder, onBelo, onKort, prov = [], onProvschema, onTranaProv }) {
  const kommande = kommandeProv(prov).slice(0, 3);
  const np = npForBarn(barn.arskurs);
  const [filter, setFilter] = useState(null);
  const amnesNamn = [...new Set(material.map(amnesEtikett))];
  const visade = filter ? material.filter((m) => amnesEtikett(m) === filter) : material;

  return (
    <main className="app bred">
      <div className={`topp ${barn.tema || ""}`} style={barn.tema ? undefined : { background: barn.farg }}>
        {barn.tema === "capy" && <Capybara className="capy-bild" storlek={120} />}
        <button className="pill" onClick={onByt}>Byt person</button>
        {barn.tema === "lfc" && (bilder?.logo ? <img className="klubblogo" src={bilder.logo} alt="Klubbmärke" /> : <FotbollIkon />)}
        {barn.tema === "kpop" && <Ljusstav />}
        {barn.tema === "cheer" && <Pompom />}
        {barn.tema === "pop" && <Vinyl />}
        <h1>{halsning(barn)}</h1>
        {barn.koreanska && <p className="koreansk-rad">안녕 = annyeong = hej på koreanska</p>}
        {barn.tema === "pop" && <Armband text={barn.namn} />}
        <p style={{ opacity: 0.95 }}>Fota boken eller ladda upp en fil, så gör din hjälplärare ett förhör.</p>
        <button className="pill" onClick={onBelo}>{beloKort(barn, belo)}</button>
      </div>
      <div className="sida tva-kolumner">
        <div className="kolumn">
        <button className="knapp" onClick={onFota}>
          <KameraIkon /> Ny läxa eller prov
        </button>
        {np && (
          <button className="knapp ram" onClick={onNp} style={{ flexDirection: "column", gap: 2, borderColor: barn.farg }}>
            Träna på nationella prov
            <span className="dov" style={{ fontWeight: 600 }}>{np.iforvag ? `Inför åk ${np.ak}` : `Åk ${np.ak}`}: {np.amnen.slice(0, 3).join(", ")}{np.amnen.length > 3 ? " m.fl." : ""}</span>
          </button>
        )}
        {barn.koreanska && <DagensOrd barn={barn} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2>Mina prov</h2>
          <button className="tabort" style={{ alignSelf: "auto" }} onClick={onProvschema}>{prov.length ? "Provschema" : "Lägg in prov"}</button>
        </div>
        {kommande.length === 0 && <p className="dov">Inga prov inlagda. Lägg in dina prov så påminner jag dig och hjälper dig träna i tid.</p>}
        {kommande.map((p) => (
          <div className="kort provkort" key={p.id} style={{ borderLeftColor: barn.farg }}>
            <span className="amne" style={{ color: barn.farg }}>{p.amne} · {dagarKvarText(p.datum)}</span>
            <span style={{ fontWeight: 800 }}>{p.vad || `Prov i ${p.amne}`}</span>
            <span className="dov">{formatDatum(p.datum)}</span>
            <button className="liten-knapp" style={{ background: barn.ljus, alignSelf: "flex-start", padding: "8px 16px" }} onClick={() => onTranaProv(p)}>Träna inför provet</button>
          </div>
        ))}
        </div>
        <div className="kolumn">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2>Mina hjälplärare</h2>
          <button className="tabort" style={{ alignSelf: "auto" }} onClick={onAmnen}>Mina ämnen</button>
        </div>
        {amnesNamn.length > 1 && (
          <div className="chips">
            <Chip aktiv={!filter} farg={barn.farg} onClick={() => setFilter(null)}>Alla</Chip>
            {amnesNamn.map((n) => (
              <Chip key={n} aktiv={filter === n} farg={barn.farg} onClick={() => setFilter(n)}>{n}</Chip>
            ))}
          </div>
        )}
        {material.length === 0 && <p className="dov">Här hamnar dina förhör. Börja med "Ny läxa eller prov".</p>}
        {visade.map((m) => (
          <div className="kort" key={m.id}>
            <span className="amne" style={{ color: barn.farg }}>{amnesEtikett(m)} · {m.lage === "prov" ? "Provträning" : "Läxförhör"}{m.niva && m.niva !== "blandat" ? ` · ${nivaNamn(m.niva, barn.arskurs)}` : ""}</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{m.titel}</span>
            <span className="dov">
              {m.fragor.length} frågor
              {m.senast ? ` · Senast ${m.senast.ratt} av ${m.senast.antal} rätt` : " · Inte gjort än"}
            </span>
            <div className="rad">
              <button className="liten-knapp" style={{ background: barn.ljus }} onClick={() => onStarta(m)}>
                {m.senast ? "Träna igen" : "Starta"}
              </button>
              <button className="liten-knapp" style={{ background: "#fff", border: `2px solid ${barn.ljus}` }} onClick={() => onKort(m)}>
                Bläddrakort
              </button>
            </div>
            <button className="tabort" onClick={() => confirm("Ta bort det här förhöret?") && onTaBort(m.id)}>Ta bort</button>
          </div>
        ))}
        </div>
      </div>
    </main>
  );
}

function Chip({ aktiv, farg, onClick, children }) {
  return (
    <button type="button" className="chip" onClick={onClick}
      style={{ background: aktiv ? farg : "#fff", color: aktiv ? "#fff" : "#1F2937", borderColor: farg }}>
      {children}
    </button>
  );
}

// Formulär för att skapa ett eget ämne.
function NyttAmne({ barn, onSpara, onAvbryt }) {
  const [namn, setNamn] = useState("");
  const [typ, setTyp] = useState("lasamne");
  const [sprak, setSprak] = useState("en-GB");

  function spara(e) {
    e.preventDefault();
    if (!namn.trim()) return;
    onSpara({
      id: Date.now().toString(36),
      namn: namn.trim().slice(0, 40),
      typ,
      sprak: typ === "sprak" ? sprak : "",
    });
  }

  return (
    <form className="kort" onSubmit={spara} style={{ borderColor: barn.farg, borderWidth: 2 }}>
      <label className="etikett">
        Vad heter ämnet?
        <input className="falt" value={namn} onChange={(e) => setNamn(e.target.value)} placeholder="t.ex. Spanska, Historia, Biologi" autoFocus />
      </label>
      <span style={{ fontWeight: 800, fontSize: 15 }}>Vilken sorts ämne?</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(TYPER).map(([id, t]) => (
          <button type="button" key={id} className="typval" onClick={() => setTyp(id)}
            style={{ borderColor: typ === id ? barn.farg : "#E5E7EB", background: typ === id ? barn.ljus : "#fff" }}>
            <strong>{t.namn}</strong>
            <span className="dov">{t.info}</span>
          </button>
        ))}
      </div>
      {typ === "sprak" && (
        <label className="etikett">
          Vilket språk? (för uppläsning)
          <select className="falt" value={sprak} onChange={(e) => setSprak(e.target.value)}>
            {SPRAK.map((s) => <option key={s.kod} value={s.kod}>{s.namn}</option>)}
          </select>
        </label>
      )}
      <div className="rad">
        <button type="button" className="liten-knapp" style={{ background: "#F3F4F6" }} onClick={onAvbryt}>Avbryt</button>
        <button className="liten-knapp" style={{ background: barn.farg, color: "#fff" }} disabled={!namn.trim()}>Spara ämnet</button>
      </div>
    </form>
  );
}

// Skickar en förfrågan om ett förhör och tolkar svaret. Används av foto- och NP-flödet.
async function hamtaForhor(payload, onFelKod) {
  const r = await fetch("/api/skapa", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { alert("Familjekoden stämmer inte längre. Skriv in den igen."); onFelKod(); return null; }
  if (r.status === 413) throw new Error("Bilderna är för stora. Prova med färre bilder.");
  if (r.status === 504) throw new Error("Det tog för lång tid. Försök igen.");
  if (!r.ok) throw new Error(data.fel || `Något gick fel (felkod ${r.status}).`);
  if (!data.fragor || data.fragor.length === 0) {
    throw new Error(data.sammanfattning || "Hittade inga frågor att göra.");
  }
  return data;
}

function Laddar({ barn, text }) {
  return (
    <main className="app">
      <div className="sida laddar">
        <div className="snurra" style={{ borderTopColor: barn.farg }} />
        <h1 style={{ fontSize: 24 }}>{text}</h1>
        <p className="dov">Det tar ungefär en halv minut.</p>
      </div>
    </main>
  );
}

function NivaVal({ barn, niva, setNiva }) {
  const vald = NIVAER.find((n) => n.id === niva);
  return (
    <>
      <span style={{ fontWeight: 800, fontSize: 15 }}>Hur svårt?</span>
      <div className="chips">
        {NIVAER.map((n) => (
          <Chip key={n.id} aktiv={niva === n.id} farg={barn.farg} onClick={() => setNiva(n.id)}>
            {barn.arskurs < 6 ? n.ung : n.namn}
          </Chip>
        ))}
      </div>
      {vald && <p className="dov">{vald.info}</p>}
    </>
  );
}

function NationellaProv({ barn, kod, onTillbaka, onKlar, onFelKod }) {
  const np = npForBarn(barn.arskurs);
  const [amne, setAmne] = useState(null);
  const [niva, setNiva] = useState("blandat");
  const [vantar, setVantar] = useState(false);
  const [fel, setFel] = useState("");

  async function starta() {
    setVantar(true);
    setFel("");
    try {
      const data = await hamtaForhor({ kod, barnId: barn.id, np: { ak: np.ak, amne }, niva }, onFelKod);
      if (!data) return;
      onKlar({
        ...data,
        id: Date.now().toString(36),
        lage: "prov",
        niva,
        amneNamn: `Nationellt prov · ${amne}`,
        amneTyp: amne === "Engelska" ? "sprak" : "annat",
        sprak: amne === "Engelska" ? "en-GB" : "",
        skapad: new Date().toISOString(),
      });
    } catch (e) {
      setFel(e.message);
      setVantar(false);
    }
  }

  if (vantar) return <Laddar barn={barn} text="Din hjälplärare skriver ett övningsprov…" />;

  return (
    <main className="app">
      <div className="sida">
        <button className="pill" onClick={onTillbaka}>Tillbaka</button>
        <p className="liten-rubrik">{np.iforvag ? `Förbered dig inför åk ${np.ak}` : `Årskurs ${np.ak}`}</p>
        <h1>Nationella prov</h1>
        <p>
          {np.iforvag
            ? `Du går i åk ${barn.arskurs}. Nationella proven kommer i åk ${np.ak}, men det är aldrig för tidigt att börja träna.`
            : `I åk ${np.ak} har du nationella prov i de här ämnena. Välj ett så gör din hjälplärare ett övningsprov i samma stil.`}
        </p>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Vilket ämne?</span>
        <div className="chips">
          {np.amnen.map((a) => (
            <Chip key={a} aktiv={amne === a} farg={barn.farg} onClick={() => setAmne(a)}>{a}</Chip>
          ))}
        </div>
        <NivaVal barn={barn} niva={niva} setNiva={setNiva} />
        <p className="dov">Proven är egna övningsuppgifter i samma stil som de riktiga, inte de riktiga proven. Svenska och engelska börjar med en text att läsa (eller lyssna på).</p>
        {fel && <p className="fel">{fel}</p>}
        <button className="knapp" style={{ background: barn.farg, marginTop: "auto" }} disabled={!amne} onClick={starta}>
          Starta övningsprov
        </button>
      </div>
    </main>
  );
}

function DagensOrd({ barn }) {
  const [hangul, uttal, svenska] = dagensUttryck();
  return (
    <div className="kort dagens-ord" style={{ borderColor: barn.farg }}>
      <span className="amne" style={{ color: barn.farg }}>Dagens koreanska</span>
      <span className="hangul">{hangul}</span>
      <span style={{ fontWeight: 800 }}>{uttal} · {svenska}</span>
      <button className="liten-knapp" style={{ background: barn.ljus, alignSelf: "flex-start", padding: "8px 14px" }} onClick={() => lasUpp(hangul, "ko-KR")}>
        <HogtalarIkon /> Lyssna
      </button>
    </div>
  );
}

function Pepp({ barn, ratt }) {
  const [p] = useState(() => slumpa(ratt ? PEPP_RATT : PEPP_FEL));
  return (
    <button type="button" className="pepp" onClick={() => lasUpp(p[0], "ko-KR")} title="Lyssna">
      <span className="hangul-liten">{p[0]}</span> {p[1]} · {p[2]}
    </button>
  );
}

function halsning(barn) {
  if (barn.koreanska) return `안녕, ${barn.namn}!`;
  if (barn.tema === "lfc") return `Kom igen, ${barn.namn}!`;
  if (barn.tema === "kpop") return `Annyeong, ${barn.namn}!`;
  if (barn.tema === "cheer") return `Go ${barn.namn}!`;
  return `Hej ${barn.namn}!`;
}

function idagStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dagarKvar(datum) {
  return Math.round((new Date(datum + "T12:00:00") - new Date(idagStr() + "T12:00:00")) / 86400000);
}
function dagarKvarText(datum) {
  const n = dagarKvar(datum);
  if (n === 0) return "idag!";
  if (n === 1) return "imorgon";
  return `om ${n} dagar`;
}
function formatDatum(datum) {
  try {
    return new Date(datum + "T12:00:00").toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return datum;
  }
}
function kommandeProv(prov) {
  return prov.filter((p) => dagarKvar(p.datum) >= 0).sort((a, b) => a.datum.localeCompare(b.datum));
}

function Provschema({ barn, amnen, prov, onSpara, onTillbaka }) {
  const [amne, setAmne] = useState(amnen[0]?.namn || "");
  const [datum, setDatum] = useState("");
  const [vad, setVad] = useState("");
  const kommande = kommandeProv(prov);
  const gamla = prov.filter((p) => dagarKvar(p.datum) < 0);

  function lagg(e) {
    e.preventDefault();
    if (!amne || !datum) return;
    onSpara([...prov, { id: Date.now().toString(36), amne, datum, vad: vad.trim().slice(0, 120) }]);
    setVad("");
    setDatum("");
  }

  return (
    <main className="app">
      <div className="sida">
        <button className="pill" onClick={onTillbaka}>Tillbaka</button>
        <h1>Mitt provschema</h1>
        <form className="kort" onSubmit={lagg}>
          <span style={{ fontWeight: 800 }}>Lägg in ett prov</span>
          <div className="chips">
            {amnen.map((a) => (
              <Chip key={a.id} aktiv={amne === a.namn} farg={barn.farg} onClick={() => setAmne(a.namn)}>{a.namn}</Chip>
            ))}
          </div>
          <label className="etikett">
            Datum
            <input className="falt" type="date" value={datum} min={idagStr()} onChange={(e) => setDatum(e.target.value)} />
          </label>
          <label className="etikett">
            Vad handlar provet om? (valfritt)
            <input className="falt" value={vad} onChange={(e) => setVad(e.target.value)} placeholder="t.ex. kapitel 4, vikingatiden" />
          </label>
          <button className="knapp" style={{ background: barn.farg }} disabled={!amne || !datum}>Spara provet</button>
        </form>
        {kommande.map((p) => (
          <div className="kort provkort" key={p.id} style={{ borderLeftColor: barn.farg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong>{p.amne} · {dagarKvarText(p.datum)}</strong>
              <span className="dov">{formatDatum(p.datum)}{p.vad ? ` · ${p.vad}` : ""}</span>
            </span>
            <button className="tabort" style={{ alignSelf: "auto" }} onClick={() => onSpara(prov.filter((x) => x.id !== p.id))}>Ta bort</button>
          </div>
        ))}
        {gamla.length > 0 && (
          <button className="tabort" onClick={() => onSpara(prov.filter((p) => dagarKvar(p.datum) >= 0))}>Rensa gamla prov ({gamla.length})</button>
        )}
      </div>
    </main>
  );
}

function ForklaraIgen({ barn, kod, fraga, mittSvar }) {
  const [oppen, setOppen] = useState(false);
  const [undran, setUndran] = useState("");
  const [svar, setSvar] = useState([]);
  const [vantar, setVantar] = useState(false);
  const [fel, setFel] = useState("");

  async function fraga_() {
    setVantar(true);
    setFel("");
    try {
      const r = await fetch("/api/forklara", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kod, barnId: barn.id, fraga, mittSvar, undran }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.fel || "Något gick fel.");
      setSvar((s) => [...s, d.text]);
      setUndran("");
    } catch (e) {
      setFel(e.message);
    }
    setVantar(false);
  }

  if (!oppen) {
    return (
      <button className="knapp ram" onClick={() => setOppen(true)}>Förklara igen</button>
    );
  }
  return (
    <div className="kort">
      {svar.map((t, i) => (
        <div key={i} className="forklaring">
          <p>{t}</p>
          <button className="liten-knapp" style={{ background: barn.ljus, alignSelf: "flex-start", padding: "8px 14px" }} onClick={() => lasUpp(t)}>
            <HogtalarIkon /> Läs upp
          </button>
        </div>
      ))}
      <label className="etikett">
        {svar.length ? "Vill du fråga något mer?" : "Vad är det du inte förstår? (valfritt)"}
        <input className="falt" value={undran} onChange={(e) => setUndran(e.target.value)} placeholder="t.ex. varför blir det 12?" />
      </label>
      {fel && <p className="fel">{fel}</p>}
      <button className="knapp" style={{ background: barn.farg }} disabled={vantar} onClick={fraga_}>
        {vantar ? "Hjälpläraren tänker…" : svar.length ? "Fråga igen" : "Förklara på ett annat sätt"}
      </button>
    </div>
  );
}

function beloKort(barn, belo) {
  if (barn.belo === "djur") return `Mina djur: ${belo.samling || 0}`;
  if (barn.belo === "klister") return `Mina klistermärken: ${belo.samling || 0}`;
  if (barn.belo === "fotboll") return `Mina spelarkort: ${Math.min(belo.samling || 0, SPELARE.length)} av ${SPELARE.length}`;
  const d = dagarIRad(belo.dagar || []);
  return `${d} ${d === 1 ? "dag" : "dagar"} i rad`;
}

function Vinst({ barn, vinst, bilder }) {
  if (!vinst) return null;
  if (vinst.typ === "dagar") {
    return (
      <div className="vinst" style={{ background: barn.ljus }}>
        <strong style={{ fontSize: 28 }}>{vinst.dagar} {vinst.dagar === 1 ? "dag" : "dagar"} i rad</strong>
        {vinst.nyttMarke ? <span>Nytt märke: {vinst.nyttMarke} dagar i rad!</span> : <span>Träna imorgon också så växer kedjan.</span>}
      </div>
    );
  }
  if (vinst.typ === "fotboll") {
    return (
      <div className="vinst" style={{ background: barn.ljus }}>
        <span style={{ fontWeight: 800 }}>{vinst.nya.length > 1 ? "Två nya spelarkort!" : "Nytt spelarkort!"}</span>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {vinst.nya.map((sp, i) => <SpelarKort key={i} spelare={sp} bild={bilder?.spelare?.[sp[0]]} />)}
        </div>
        <span className="dov">Du har {Math.min(vinst.totalt, SPELARE.length)} av {SPELARE.length} spelare.</span>
      </div>
    );
  }
  return (
    <div className="vinst" style={{ background: barn.ljus }}>
      <span style={{ fontWeight: 800 }}>{vinst.typ === "djur" ? "Nya djur i din samling!" : "Nya klistermärken!"}</span>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {vinst.nya.map(([tecken, namnEllerFarg], i) => (
          <span key={i} className="samlad" style={{ background: vinst.typ === "klister" ? namnEllerFarg : "#fff" }}>
            <span style={{ fontSize: 44 }} aria-hidden="true">{tecken}</span>
            {vinst.typ === "djur" && <span style={{ fontSize: 13, fontWeight: 700 }}>{namnEllerFarg}</span>}
          </span>
        ))}
      </div>
      <span className="dov">Du har samlat {vinst.totalt} totalt.</span>
      {barn.koreanska && <span style={{ fontWeight: 800 }}><span className="hangul-liten">대박!</span> daebak · Grymt jobbat!</span>}
    </div>
  );
}

function Beloningar({ barn, belo, bilder, egna, onBilder, onTillbaka }) {
  const [andra, setAndra] = useState(false);
  if (barn.belo === "fotboll") {
    const antal = belo.samling || 0;
    async function valjBild(e, namn) {
      const fil = e.target.files?.[0];
      e.target.value = "";
      if (!fil) return;
      const bild = await litenBild(fil, 260);
      onBilder({ ...egna, spelare: { ...(egna.spelare || {}), [namn]: bild } });
    }
    async function valjLogo(e) {
      const fil = e.target.files?.[0];
      e.target.value = "";
      if (!fil) return;
      onBilder({ ...egna, logo: await litenBild(fil, 200, "image/png") });
    }
    return (
      <main className="app">
        <div className="topp lfc">
          <button className="pill" onClick={onTillbaka}>Tillbaka</button>
          {bilder?.logo && <img className="klubblogo" src={bilder.logo} alt="Klubbmärke" />}
          <h1>Mitt lag</h1>
          <p style={{ opacity: 0.95 }}>{Math.min(antal, SPELARE.length)} av {SPELARE.length} Liverpool-spelare. Ett nytt kort för varje förhör, två om du har minst 80 % rätt.</p>
        </div>
        <div className="sida">
          <button className="tabort" style={{ alignSelf: "flex-end" }} onClick={() => setAndra(!andra)}>{andra ? "Klar med bilderna" : "Byt bilder själv"}</button>
          {andra && (
            <div className="kort">
              <p>Bilderna hämtas automatiskt från Wikipedia. Vill du byta någon kan du välja en egen från mobilens bilder. Den sparas bara på den här mobilen.</p>
              <label className="knapp" style={{ background: "#C8102E" }}>
                {bilder?.logo ? "Byt klubbmärke" : "Välj klubbmärke"}
                <input type="file" accept="image/*" onChange={valjLogo} style={{ display: "none" }} />
              </label>
              <p className="dov">Tryck på ett kort nedan för att välja bild till den spelaren.</p>
            </div>
          )}
          {!andra && <p className="dov">Du har gjort {belo.forhor || 0} förhör och tränat {(belo.dagar || []).length} olika dagar.</p>}
          <div className="spelargrid">
            {SPELARE.map((sp, i) =>
              andra ? (
                <label key={i} style={{ cursor: "pointer" }}>
                  <SpelarKort spelare={sp} bild={bilder?.spelare?.[sp[0]]} />
                  <input type="file" accept="image/*" onChange={(e) => valjBild(e, sp[0])} style={{ display: "none" }} />
                </label>
              ) : (
                <SpelarKort key={i} spelare={sp} last={i >= antal} bild={bilder?.spelare?.[sp[0]]} />
              )
            )}
          </div>
          <p className="dov" style={{ fontSize: 12 }}>Bilder från Wikipedia och Wikimedia Commons.</p>
        </div>
      </main>
    );
  }
  const lista = barn.belo === "djur" ? DJUR : barn.belo === "klister" ? KLISTER : null;
  const antal = belo.samling || 0;
  const dagar = dagarIRad(belo.dagar || []);
  return (
    <main className="app">
      <div className="sida">
        <button className="pill" onClick={onTillbaka}>Tillbaka</button>
        <h1>{barn.belo === "djur" ? "Min djursamling" : barn.belo === "klister" ? "Mina klistermärken" : "Min träning"}</h1>
        <p className="dov">Du har gjort {belo.forhor || 0} förhör och tränat {(belo.dagar || []).length} olika dagar.</p>
        {lista ? (
          <>
            <p>Du får {barn.belo === "djur" ? "ett nytt djur" : "ett nytt klistermärke"} för varje förhör du gör klart, och två om du har minst 80 % rätt.</p>
            <div className="samling">
              {lista.map(([tecken, x], i) => (
                <span key={i} className="samlad" style={{ background: i < antal ? (barn.belo === "klister" ? x : "#fff") : "#F3F4F6", opacity: i < antal ? 1 : 0.5 }}>
                  <span style={{ fontSize: 34, filter: i < antal ? "none" : "grayscale(1) brightness(0.3)" }} aria-hidden="true">{i < antal ? tecken : "?"}</span>
                  {barn.belo === "djur" && <span style={{ fontSize: 11, fontWeight: 700 }}>{i < antal ? x : "???"}</span>}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="vinst" style={{ background: barn.ljus }}>
              <strong style={{ fontSize: 40 }}>{dagar}</strong>
              <span>{dagar === 1 ? "dag" : "dagar"} i rad</span>
            </div>
            <h2>Märken</h2>
            <div className="samling">
              {MARKEN.map((m) => {
                const langsta = langstaKedja(belo.dagar || []);
                const har = langsta >= m;
                return (
                  <span key={m} className="samlad" style={{ background: har ? barn.farg : "#F3F4F6", color: har ? "#fff" : "#6B7280" }}>
                    <strong style={{ fontSize: 22 }}>{m}</strong>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>dagar</span>
                  </span>
                );
              })}
            </div>
            <p className="dov">Ett märke låses upp när du har tränat så många dagar i rad.</p>
          </>
        )}
      </div>
    </main>
  );
}

// Spelarkort i röd/vit Liverpool-stil. Bilden är en som familjen själv valt på mobilen.
function SpelarKort({ spelare, last = false, bild = "" }) {
  const [namn, position, nummer, epok] = spelare;
  if (last) {
    return (
      <div className="spelarkort last" aria-label="Okänd spelare">
        <span className="nummer">?</span>
        <span className="spnamn">Ej upplåst</span>
      </div>
    );
  }
  return (
    <div className="spelarkort">
      {bild ? <img className="spelarbild" src={bild} alt={namn} /> : (
      <svg viewBox="0 0 64 56" width="58" height="50" aria-hidden="true">
        <path d="M20 4 L8 10 L2 24 L12 28 L14 22 L14 54 L50 54 L50 22 L52 28 L62 24 L56 10 L44 4 Q32 12 20 4 Z" fill="#fff" opacity="0.95" />
        <text x="32" y="44" textAnchor="middle" fontSize="20" fontWeight="800" fill="#C8102E">{nummer || "★"}</text>
      </svg>
      )}
      {bild && nummer ? <span className="spnummer">{nummer}</span> : null}
      <span className="spnamn">{namn}</span>
      <span className="spinfo">{position}</span>
      <span className="spinfo">{epok}</span>
    </div>
  );
}

function langstaKedja(dagar) {
  const s = [...new Set(dagar)].sort();
  let basta = 0, nu = 0, forra = null;
  for (const d of s) {
    const t = new Date(d + "T12:00:00");
    nu = forra && (t - forra) / 86400000 === 1 ? nu + 1 : 1;
    basta = Math.max(basta, nu);
    forra = t;
  }
  return basta;
}

// Bläddrakort: framsida och baksida, "Kunde" eller "Öva mer". Korten man inte kunde kommer tillbaka.
function gorKort(forhor) {
  return forhor.fragor.map((f) => {
    const ord = f.lasupp && normalisera(f.lasupp) !== normalisera(f.ratt) ? f.lasupp : "";
    return {
      fram: ord || f.fraga,
      bak: f.ratt,
      extra: f.forklaring,
      ord: ord || (f.lasupp && normalisera(f.lasupp) === normalisera(f.ratt) ? f.lasupp : ""),
      sprak: f.lasupp_sprak || forhor.sprak || "",
      ordPaFram: Boolean(ord),
    };
  });
}

function Bladdrakort({ barn, forhor, bilder, onBelona, onKlar }) {
  const [hog, setHog] = useState(() => gorKort(forhor));
  const [vand, setVand] = useState(false);
  const [kunde, setKunde] = useState(0);
  const [totalt] = useState(() => gorKort(forhor).length);
  const [forsta, setForsta] = useState(new Set());
  const [klar, setKlar] = useState(false);
  const [vinst, setVinst] = useState(null);
  const [uttal, setUttal] = useState("");
  const [lyssnar, setLyssnar] = useState(false);
  const kort = hog[0];

  function svar(ok) {
    const [nu, ...resten] = hog;
    const nyckel = nu.fram;
    if (ok && !forsta.has(nyckel)) setKunde((k) => k + 1);
    if (!ok) setForsta((f) => new Set(f).add(nyckel));
    const ny = ok ? resten : [...resten, nu];
    setVand(false);
    setUttal("");
    if (ny.length === 0) {
      setVinst(onBelona(kunde / totalt + (ok && !forsta.has(nyckel) ? 1 / totalt : 0)));
      setKlar(true);
    }
    setHog(ny);
  }

  async function sagOrdet() {
    setLyssnar(true);
    setUttal("");
    try {
      const hort = await lyssnaPa(kort.sprak);
      const ratt = hort.some((h) => normalisera(h) === normalisera(kort.ord));
      setUttal(ratt ? "Bra uttal! Jag förstod precis vad du sa." : `Jag hörde "${hort[0]}". Lyssna en gång till och försök igen.`);
    } catch (e) {
      setUttal(e.message);
    }
    setLyssnar(false);
  }

  if (klar) {
    return (
      <main className="app">
        <div className="sida" style={{ justifyContent: "center", textAlign: "center" }}>
          <h1>Alla kort klara!</h1>
          <p style={{ fontSize: 20, fontWeight: 800, color: barn.farg }}>Du kunde {kunde} av {totalt} direkt</p>
          <Vinst barn={barn} vinst={vinst} bilder={bilder} />
          <button className="knapp" style={{ background: barn.farg }} onClick={onKlar}>Klar</button>
        </div>
      </main>
    );
  }

  const kanPrata = kort.ord && kort.sprak && kort.sprak !== "sv-SE" && taligenkanningFinns();

  return (
    <main className="app">
      <div className="sida">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="pill" onClick={onKlar}>Avsluta</button>
          <span className="dov" style={{ fontWeight: 700 }}>{hog.length} kort kvar</span>
        </div>
        <button className={`bladdrakort ${vand ? "vand" : ""}`} style={{ borderColor: barn.farg }} onClick={() => setVand(!vand)}>
          <span className="amne" style={{ color: barn.farg }}>{vand ? "Baksida" : "Framsida"} · tryck för att vända</span>
          <span className="korttext">{vand ? kort.bak : kort.fram}</span>
          {vand && kort.extra && <span className="dov">{kort.extra}</span>}
        </button>
        <div className="rad" style={{ flexWrap: "wrap" }}>
          {kort.ord && (
            <button className="liten-knapp" style={{ background: barn.ljus, flex: "0 0 auto", padding: "8px 14px" }} onClick={() => lasUpp(kort.ord, kort.sprak)}>
              <HogtalarIkon /> Lyssna
            </button>
          )}
          {kanPrata && (
            <button className="liten-knapp" style={{ background: barn.ljus, flex: "0 0 auto", padding: "8px 14px" }} disabled={lyssnar} onClick={sagOrdet}>
              <MikIkon /> {lyssnar ? "Jag lyssnar…" : "Säg ordet"}
            </button>
          )}
        </div>
        {uttal && <p className="ledtrad">{uttal}</p>}
        {vand ? (
          <div className="rad" style={{ marginTop: "auto" }}>
            <button className="knapp ram" onClick={() => svar(false)}>Öva mer</button>
            <button className="knapp" style={{ background: barn.farg }} onClick={() => svar(true)}>Jag kunde</button>
          </div>
        ) : (
          <button className="knapp" style={{ marginTop: "auto" }} onClick={() => setVand(true)}>Vänd kortet</button>
        )}
      </div>
    </main>
  );
}

function Amnen({ barn, amnen, onTillbaka, onLaggTill, onTaBort }) {
  const [ny, setNy] = useState(false);
  return (
    <main className="app">
      <div className="sida">
        <button className="pill" onClick={onTillbaka}>Tillbaka</button>
        <h1>Mina ämnen</h1>
        <p className="dov">Ämnets sort bestämmer hur din hjälplärare gör förhören. Språk får uppläsning, läsämnen får en sammanfattning först.</p>
        {amnen.map((a) => (
          <div className="kort" key={a.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong style={{ fontSize: 17 }}>{a.namn}</strong>
              <span className="dov">{TYPER[a.typ]?.namn}{a.sprak ? ` · uppläsning på ${sprakNamn(a.sprak).toLowerCase()}` : ""}</span>
            </span>
            <button className="tabort" style={{ alignSelf: "auto" }} onClick={() => confirm(`Ta bort ämnet ${a.namn}?`) && onTaBort(a.id)}>Ta bort</button>
          </div>
        ))}
        {ny ? (
          <NyttAmne barn={barn} onSpara={(a) => { onLaggTill(a); setNy(false); }} onAvbryt={() => setNy(false)} />
        ) : (
          <button className="knapp ram" onClick={() => setNy(true)}>+ Nytt ämne</button>
        )}
      </div>
    </main>
  );
}

function Fota({ barn, kod, amnen, startProv, onNyttAmne, onTillbaka, onKlar, onFelKod }) {
  const [bilder, setBilder] = useState([]);
  const [filer, setFiler] = useState([]); // PDF, Word och PowerPoint
  const [laser, setLaser] = useState(false);
  const [lage, setLage] = useState(startProv ? "prov" : "forhor");
  const [anteckning, setAnteckning] = useState(startProv?.vad || "");
  const [vantar, setVantar] = useState(false);
  const [fel, setFel] = useState("");
  const [amneId, setAmneId] = useState(() =>
    startProv ? amnen.find((a) => a.namn.toLowerCase() === String(startProv.amne).toLowerCase())?.id || null : null
  );
  const [niva, setNiva] = useState("blandat");
  const [nyttAmne, setNyttAmne] = useState(false);
  const amne = amnen.find((a) => a.id === amneId);

  async function laggTill(e) {
    const filer = Array.from(e.target.files || []);
    e.target.value = "";
    const nya = await Promise.all(filer.map((f) => krympBild(f)));
    setBilder((gamla) => [...gamla, ...nya].slice(0, 6));
  }

  async function laggTillFil(e) {
    const valda = Array.from(e.target.files || []);
    e.target.value = "";
    setFel("");
    setLaser(true);
    const nya = [];
    for (const f of valda) {
      try { nya.push(await lasFil(f)); } catch (err) { setFel(err.message); }
    }
    setLaser(false);
    setFiler((gamla) => {
      const alla = [...gamla, ...nya];
      let pdf = 0;
      // Högst 3 filer och högst en PDF, så att allt får plats i ett anrop.
      return alla.filter((f) => (f.typ === "pdf" ? ++pdf <= 1 : true)).slice(0, 3);
    });
    if (nya.filter((f) => f.typ === "pdf").length + filer.filter((f) => f.typ === "pdf").length > 1) {
      setFel("Du kan bara ha en PDF åt gången.");
    }
  }

  const harMaterial = bilder.length + filer.length > 0;

  async function skapa() {
    setVantar(true);
    setFel("");
    try {
      const r = await fetch("/api/skapa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kod, barnId: barn.id, bilder, filer, lage, anteckning, amne, niva }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) { alert("Familjekoden stämmer inte längre. Skriv in den igen."); return onFelKod(); }
      if (r.status === 413) throw new Error("Materialet är för stort. Prova med färre bilder eller en mindre fil.");
      if (r.status === 504) throw new Error("Det tog för lång tid. Prova med färre bilder eller försök igen.");
      if (!r.ok) throw new Error(data.fel || `Något gick fel (felkod ${r.status}).`);
      if (!data.fragor || data.fragor.length === 0) {
        throw new Error(data.sammanfattning || "Hittade inga frågor att göra. Prova att fota tydligare.");
      }
      onKlar({
        ...data,
        id: Date.now().toString(36),
        lage,
        niva,
        amneId: amne.id,
        amneNamn: amne.namn,
        amneTyp: amne.typ,
        sprak: amne.sprak,
        skapad: new Date().toISOString(),
      });
    } catch (e) {
      setFel(e.message);
      setVantar(false);
    }
  }

  if (vantar) {
    return (
      <main className="app">
        <div className="sida laddar">
          <div className="snurra" style={{ borderTopColor: barn.farg }} />
          <h1 style={{ fontSize: 24 }}>Din hjälplärare läser materialet…</h1>
          <p className="dov">Det tar ungefär en halv minut.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app bred">
      <div className="sida">
        <button className="pill" onClick={onTillbaka}>Tillbaka</button>
        <h1>Lägg till ditt material</h1>
        <div className="tva-kolumner">
        <div className="kolumn">
        <div className="rad">
          <label className="fotoyta" style={{ borderColor: barn.farg, background: barn.ljus }}>
            <KameraIkon storlek={36} />
            Ta foto
            <input type="file" accept="image/*" capture="environment" onChange={laggTill} style={{ display: "none" }} />
          </label>
          <label className="fotoyta" style={{ borderColor: barn.farg, background: barn.ljus }}>
            <BildIkon storlek={36} />
            Välj bilder
            <input type="file" accept="image/*" multiple onChange={laggTill} style={{ display: "none" }} />
          </label>
        </div>
        <label className="filknapp" style={{ borderColor: barn.farg }}>
          <FilIkon /> {laser ? "Läser filen…" : "Välj fil (PDF, Word, PowerPoint)"}
          <input type="file" accept={FIL_ACCEPT} multiple onChange={laggTillFil} style={{ display: "none" }} />
        </label>
        {(!harMaterial || bilder.length > 0) && <p className="dov" style={{ textAlign: "center" }}>
          {!harMaterial ? "Fota direkt, välj bilder du redan har eller ladda upp en fil, t.ex. från Google Classroom." : bilder.length ? `${bilder.length} av högst 6 bilder` : ""}
        </p>}
        {filer.map((f, i) => (
          <div key={i} className="filrad" style={{ background: barn.ljus }}>
            <FilIkon />
            <span className="filnamn">{f.namn}</span>
            <button aria-label="Ta bort fil" onClick={() => setFiler(filer.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {bilder.length > 0 && (
          <div className="miniatyrer">
            {bilder.map((b, i) => (
              <div key={i}>
                <img src={b} alt={`Bild ${i + 1}`} />
                <button aria-label="Ta bort bild" onClick={() => setBilder(bilder.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        )}
        </div>
        <div className="kolumn">
        <span style={{ fontWeight: 800, fontSize: 15 }}>Vilket ämne?</span>
        <div className="chips">
          {amnen.map((a) => (
            <Chip key={a.id} aktiv={amneId === a.id} farg={barn.farg} onClick={() => { setAmneId(a.id); setNyttAmne(false); }}>{a.namn}</Chip>
          ))}
          <Chip aktiv={nyttAmne} farg={barn.farg} onClick={() => setNyttAmne(true)}>+ Nytt ämne</Chip>
        </div>
        {nyttAmne && (
          <NyttAmne barn={barn} onAvbryt={() => setNyttAmne(false)}
            onSpara={(a) => { onNyttAmne(a); setAmneId(a.id); setNyttAmne(false); }} />
        )}
        {amne && <p className="dov">{TYPER[amne.typ]?.info}</p>}
        <div className="rad">
          <button className="liten-knapp" onClick={() => setLage("forhor")}
            style={{ background: lage === "forhor" ? barn.farg : "#fff", color: lage === "forhor" ? "#fff" : "#1F2937", border: `2px solid ${barn.farg}` }}>
            Läxförhör
          </button>
          <button className="liten-knapp" onClick={() => setLage("prov")}
            style={{ background: lage === "prov" ? barn.farg : "#fff", color: lage === "prov" ? "#fff" : "#1F2937", border: `2px solid ${barn.farg}` }}>
            Provträning
          </button>
        </div>
        <NivaVal barn={barn} niva={niva} setNiva={setNiva} />
        <label className="etikett">
          Vad vill du träna på? (valfritt)
          <input className="falt" value={anteckning} onChange={(e) => setAnteckning(e.target.value)} placeholder={amne?.typ === "sprak" ? "t.ex. glosorna svenska till engelska" : amne?.typ === "matte" ? "t.ex. bråk med olika nämnare" : "t.ex. kapitel 3 om vikingatiden"} />
        </label>
        {fel && <p className="fel">{fel}</p>}
        {harMaterial && !amne && <p className="dov" style={{ textAlign: "center" }}>Välj ett ämne först.</p>}
        <button className="knapp" style={{ background: barn.farg, marginTop: "auto" }} disabled={!harMaterial || laser || !amne} onClick={skapa}>
          Skapa min hjälplärare
        </button>
        </div>
        </div>
      </div>
    </main>
  );
}

function Forhor({ barn, kod, forhor, bilder, onKlar, onAvbryt, onBelona }) {
  const [vinst, setVinst] = useState(null);
  const [lyssnar, setLyssnar] = useState(false);
  const [talFel, setTalFel] = useState("");
  const [nr, setNr] = useState(0);
  const [antalRatt, setAntalRatt] = useState(0);
  const [valt, setValt] = useState(null); // svaret eleven gav på nuvarande fråga
  const [skrivet, setSkrivet] = useState("");
  const [visaLedtrad, setVisaLedtrad] = useState(false);
  const [klar, setKlar] = useState(false);
  const punkter = forhor.nyckelpunkter || [];
  const lastext = forhor.lastext || "";
  const [intro, setIntro] = useState(punkter.length > 0 || lastext.length > 0);

  const fragor = forhor.fragor;
  const f = fragor[nr];

  if (intro) {
    return (
      <main className="app">
        <div className="sida">
          <button className="pill" onClick={onAvbryt}>Avsluta</button>
          <p className="amne" style={{ color: barn.farg, margin: 0 }}>{forhor.amneNamn || forhor.amne}</p>
          <h1>{lastext ? forhor.titel : "Det viktigaste"}</h1>
          <p>{forhor.sammanfattning}</p>
          {lastext && (
            <div className="kort">
              <span className="amne" style={{ color: barn.farg }}>Läs texten</span>
              <p className="lastext">{lastext}</p>
              <button className="liten-knapp" style={{ background: barn.ljus, alignSelf: "flex-start", padding: "8px 14px" }}
                onClick={() => lasUpp(lastext, forhor.lastext_sprak || "sv-SE")}>
                <HogtalarIkon /> Lyssna på texten
              </button>
            </div>
          )}
          {punkter.length > 0 && (
          <div className="kort">
            <ul className="punkter">
              {punkter.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <button className="liten-knapp" style={{ background: barn.ljus, alignSelf: "flex-start", padding: "8px 14px" }}
              onClick={() => lasUpp([forhor.sammanfattning, ...punkter].join(". "))}>
              <HogtalarIkon /> Läs upp
            </button>
          </div>
          )}
          <button className="knapp" style={{ background: barn.farg, marginTop: "auto" }} onClick={() => setIntro(false)}>
            Starta förhöret ({fragor.length} frågor)
          </button>
        </div>
      </main>
    );
  }

  if (klar) {
    const andel = antalRatt / fragor.length;
    return (
      <main className="app">
        <div className="sida" style={{ justifyContent: "center", textAlign: "center" }}>
          <h1>{andel >= 0.8 ? "Superbra jobbat!" : andel >= 0.5 ? "Bra kämpat!" : "Bra att du tränar!"}</h1>
          <p style={{ fontSize: 22, fontWeight: 800, color: barn.farg }}>{antalRatt} av {fragor.length} rätt</p>
          <p className="dov">{andel >= 0.8 ? "Du kan det här. Kör igen innan provet så sitter det." : "Kör en gång till, det blir lättare för varje gång."}</p>
          <Vinst barn={barn} vinst={vinst} bilder={bilder} />
          <button className="knapp" style={{ background: barn.farg }} onClick={() => onKlar({ ratt: antalRatt, antal: fragor.length })}>Klar</button>
        </div>
      </main>
    );
  }

  const besvarad = valt !== null;
  const rattSvar =
    f.typ === "skriv"
      ? [f.ratt, ...(f.godkanda || [])].map(normalisera).includes(normalisera(valt))
      : valt === f.ratt;

  function svara(svar) {
    if (besvarad) return;
    setValt(svar);
    const ok =
      f.typ === "skriv"
        ? [f.ratt, ...(f.godkanda || [])].map(normalisera).includes(normalisera(svar))
        : svar === f.ratt;
    if (ok) setAntalRatt((n) => n + 1);
  }

  function nasta() {
    if (nr + 1 >= fragor.length) {
      if (onBelona) setVinst(onBelona(antalRatt / fragor.length));
      return setKlar(true);
    }
    setTalFel("");
    setNr(nr + 1);
    setValt(null);
    setSkrivet("");
    setVisaLedtrad(false);
  }

  return (
    <main className="app">
      <div className="sida">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="pill" onClick={onAvbryt}>Avsluta</button>
          <span className="dov" style={{ fontWeight: 700 }}>Fråga {nr + 1} av {fragor.length}</span>
        </div>
        <div className="stapel"><div style={{ width: `${((nr + (besvarad ? 1 : 0)) / fragor.length) * 100}%`, background: barn.farg }} /></div>
        {nr === 0 && !besvarad && punkter.length === 0 && !lastext && <p className="dov">{forhor.sammanfattning}</p>}
        {lastext && (
          <details className="kort">
            <summary style={{ fontWeight: 800, cursor: "pointer" }}>Visa texten igen</summary>
            <p className="lastext">{lastext}</p>
          </details>
        )}
        <div className="kort">
          <span className="amne" style={{ color: barn.farg }}>
            {forhor.amneNamn || forhor.amne}
            {f.niva ? <span className="nivatagg">{nivaNamn(f.niva, barn.arskurs)}</span> : null}
          </span>
          <p className="fraga">{f.fraga}</p>
          <div className="rad" style={{ flexWrap: "wrap" }}>
            <button className="liten-knapp" style={{ background: barn.ljus, flex: "0 0 auto", padding: "8px 14px" }} onClick={() => lasUpp(f.fraga)}>
              <HogtalarIkon /> Läs upp
            </button>
            {f.lasupp && (
              <button className="liten-knapp" style={{ background: barn.ljus, flex: "0 0 auto", padding: "8px 14px" }}
                onClick={() => lasUpp(f.lasupp, f.lasupp_sprak || forhor.sprak)}>
                <HogtalarIkon /> Lyssna{sprakNamn(f.lasupp_sprak || forhor.sprak) ? ` (${sprakNamn(f.lasupp_sprak || forhor.sprak).toLowerCase()})` : ""}
              </button>
            )}
            {!besvarad && (
              <button className="liten-knapp" style={{ background: "#FEF9C3", flex: "0 0 auto", padding: "8px 14px" }} onClick={() => setVisaLedtrad(true)}>Ledtråd</button>
            )}
          </div>
          {visaLedtrad && !besvarad && <p className="ledtrad">{f.ledtrad}</p>}
        </div>

        {f.typ === "skriv" ? (
          <form onSubmit={(e) => { e.preventDefault(); if (skrivet.trim()) svara(skrivet); }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="falt" value={skrivet} onChange={(e) => setSkrivet(e.target.value)} disabled={besvarad}
              placeholder="Skriv ditt svar" autoCapitalize="off" autoCorrect="off" spellCheck="false" />
            {!besvarad && taligenkanningFinns() && (
              <button type="button" className="liten-knapp" style={{ background: barn.ljus, alignSelf: "flex-start", padding: "8px 14px" }} disabled={lyssnar}
                onClick={async () => {
                  setLyssnar(true); setTalFel("");
                  try { const [txt] = await lyssnaPa(f.lasupp_sprak || (forhor.amneTyp === "sprak" ? forhor.sprak : "") || "sv-SE"); setSkrivet(txt); }
                  catch (e) { setTalFel(e.message); }
                  setLyssnar(false);
                }}>
                <MikIkon /> {lyssnar ? "Jag lyssnar…" : "Säg svaret"}
              </button>
            )}
            {talFel && <p className="dov">{talFel}</p>}
            {!besvarad && <button className="knapp" style={{ background: barn.farg }} disabled={!skrivet.trim()}>Svara</button>}
          </form>
        ) : (
          <div className="altlista">{(f.alternativ || []).map((a) => (
            <button key={a} onClick={() => svara(a)}
              className={`alt ${besvarad && a === f.ratt ? "ratt" : ""} ${besvarad && a === valt && a !== f.ratt ? "fel-val" : ""}`}>
              {a}
            </button>
          ))}</div>
        )}

        {besvarad && (
          <>
            <div className={`svar ${rattSvar ? "ratt" : "fel-val"}`}>
              <strong style={{ fontSize: 18 }}>{rattSvar ? "Rätt!" : `Rätt svar: ${f.ratt}`}</strong>
              <span>{f.forklaring}</span>
              {barn.koreanska && <Pepp key={nr} barn={barn} ratt={rattSvar} />}
            </div>
            <ForklaraIgen key={nr} barn={barn} kod={kod} fraga={f} mittSvar={valt} />
            <button className="knapp" onClick={nasta}>{nr + 1 >= fragor.length ? "Se resultat" : "Nästa fråga"}</button>
          </>
        )}
      </div>
    </main>
  );
}

function HogtalarIkon({ storlek = 18 }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function FilIkon({ storlek = 22 }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function BildIkon({ storlek = 24 }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function KameraIkon({ storlek = 24 }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
