"use client";

// Hela appen är en sida med flera "skärmar": login → välj barn → hem → fota → förhör.
// Förhören sparas i webbläsaren på den enhet barnet använder (localStorage).

import { useEffect, useState } from "react";
import { BARN, hittaBarn } from "../lib/barn";

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

function lasUpp(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "sv-SE";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
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

  useEffect(() => {
    setKod(lasLagrat("familjekod", null));
    setLaddat(true);
  }, []);

  useEffect(() => {
    if (barnId) setMaterial(lasLagrat(`material-${barnId}`, []));
  }, [barnId]);

  function uppdateraMaterial(lista) {
    setMaterial(lista);
    sparaLagrat(`material-${barnId}`, lista);
  }

  if (!laddat) return null;
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

  if (skarm === "fota") {
    return (
      <Fota
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

  if (skarm === "forhor" && aktivt) {
    return (
      <Forhor
        barn={barn}
        forhor={aktivt}
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

  return (
    <Hem
      barn={barn}
      material={material}
      onByt={() => setSkarm("valj")}
      onFota={() => setSkarm("fota")}
      onStarta={(m) => { setAktivt(m); setSkarm("forhor"); }}
      onTaBort={(id) => uppdateraMaterial(material.filter((m) => m.id !== id))}
    />
  );
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
    <main className="app">
      <div className="sida">
        <p className="liten-rubrik">Läxhjälpen</p>
        <h1>Vem tränar idag?</h1>
        {BARN.map((b) => (
          <button key={b.id} className="barnknapp" style={{ borderColor: b.ljus }} onClick={() => onVal(b.id)}>
            <span className="avatar" style={{ background: b.farg }}>{b.namn[0]}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 19, fontWeight: 800 }}>{b.namn}</span>
              <span className="dov">{b.info}</span>
            </span>
          </button>
        ))}
        <button className="tabort" onClick={onLoggaUt}>Logga ut den här enheten</button>
      </div>
    </main>
  );
}

function Hem({ barn, material, onByt, onFota, onStarta, onTaBort }) {
  return (
    <main className="app">
      <div className="topp" style={{ background: barn.farg }}>
        <button className="pill" onClick={onByt}>Byt person</button>
        <h1>Hej {barn.namn}!</h1>
        <p style={{ opacity: 0.95 }}>Fota en sida ur boken eller dina glosor, så gör din hjälplärare ett förhör.</p>
      </div>
      <div className="sida">
        <button className="knapp" onClick={onFota}>
          <KameraIkon /> Fota nytt material
        </button>
        <h2>Mina hjälplärare</h2>
        {material.length === 0 && <p className="dov">Här hamnar allt du fotar. Börja med knappen ovanför.</p>}
        {material.map((m) => (
          <div className="kort" key={m.id}>
            <span className="amne" style={{ color: barn.farg }}>{m.amne} · {m.lage === "prov" ? "Provträning" : "Läxförhör"}</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{m.titel}</span>
            <span className="dov">
              {m.fragor.length} frågor
              {m.senast ? ` · Senast ${m.senast.ratt} av ${m.senast.antal} rätt` : " · Inte gjort än"}
            </span>
            <div className="rad">
              <button className="liten-knapp" style={{ background: barn.ljus }} onClick={() => onStarta(m)}>
                {m.senast ? "Träna igen" : "Starta"}
              </button>
            </div>
            <button className="tabort" onClick={() => confirm("Ta bort det här förhöret?") && onTaBort(m.id)}>Ta bort</button>
          </div>
        ))}
      </div>
    </main>
  );
}

function Fota({ barn, kod, onTillbaka, onKlar, onFelKod }) {
  const [bilder, setBilder] = useState([]);
  const [lage, setLage] = useState("forhor");
  const [anteckning, setAnteckning] = useState("");
  const [vantar, setVantar] = useState(false);
  const [fel, setFel] = useState("");

  async function laggTill(e) {
    const filer = Array.from(e.target.files || []);
    e.target.value = "";
    const nya = await Promise.all(filer.map((f) => krympBild(f)));
    setBilder((gamla) => [...gamla, ...nya].slice(0, 6));
  }

  async function skapa() {
    setVantar(true);
    setFel("");
    try {
      const r = await fetch("/api/skapa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kod, barnId: barn.id, bilder, lage, anteckning }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) { alert("Familjekoden stämmer inte längre. Skriv in den igen."); return onFelKod(); }
      if (r.status === 413) throw new Error("Bilderna är för stora. Prova med färre bilder.");
      if (r.status === 504) throw new Error("Det tog för lång tid. Prova med färre bilder eller försök igen.");
      if (!r.ok) throw new Error(data.fel || `Något gick fel (felkod ${r.status}).`);
      if (!data.fragor || data.fragor.length === 0) {
        throw new Error(data.sammanfattning || "Hittade inga frågor att göra. Prova att fota tydligare.");
      }
      onKlar({ ...data, id: Date.now().toString(36), lage, skapad: new Date().toISOString() });
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
    <main className="app">
      <div className="sida">
        <button className="pill" onClick={onTillbaka}>Tillbaka</button>
        <h1>Lägg till ditt material</h1>
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
        <p className="dov" style={{ textAlign: "center" }}>
          {bilder.length === 0 ? "Fota direkt eller välj bilder du redan har, t.ex. skärmdumpar." : `${bilder.length} av högst 6 bilder`}
        </p>
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
        <label className="etikett">
          Vad vill du träna på? (valfritt)
          <input className="falt" value={anteckning} onChange={(e) => setAnteckning(e.target.value)} placeholder="t.ex. glosorna svenska till engelska" />
        </label>
        {fel && <p className="fel">{fel}</p>}
        <button className="knapp" style={{ background: barn.farg, marginTop: "auto" }} disabled={bilder.length === 0} onClick={skapa}>
          Skapa min hjälplärare
        </button>
      </div>
    </main>
  );
}

function Forhor({ barn, forhor, onKlar, onAvbryt }) {
  const [nr, setNr] = useState(0);
  const [antalRatt, setAntalRatt] = useState(0);
  const [valt, setValt] = useState(null); // svaret eleven gav på nuvarande fråga
  const [skrivet, setSkrivet] = useState("");
  const [visaLedtrad, setVisaLedtrad] = useState(false);
  const [klar, setKlar] = useState(false);

  const fragor = forhor.fragor;
  const f = fragor[nr];

  if (klar) {
    const andel = antalRatt / fragor.length;
    return (
      <main className="app">
        <div className="sida" style={{ justifyContent: "center", textAlign: "center" }}>
          <h1>{andel >= 0.8 ? "Superbra jobbat!" : andel >= 0.5 ? "Bra kämpat!" : "Bra att du tränar!"}</h1>
          <p style={{ fontSize: 22, fontWeight: 800, color: barn.farg }}>{antalRatt} av {fragor.length} rätt</p>
          <p className="dov">{andel >= 0.8 ? "Du kan det här. Kör igen innan provet så sitter det." : "Kör en gång till, det blir lättare för varje gång."}</p>
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
    if (nr + 1 >= fragor.length) return setKlar(true);
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
        {nr === 0 && !besvarad && <p className="dov">{forhor.sammanfattning}</p>}
        <div className="kort">
          <span className="amne" style={{ color: barn.farg }}>{forhor.amne}</span>
          <p className="fraga">{f.fraga}</p>
          <div className="rad" style={{ flexWrap: "nowrap" }}>
            <button className="liten-knapp" style={{ background: barn.ljus, flex: "0 0 auto", padding: "8px 14px" }} onClick={() => lasUpp(f.fraga)}>Läs upp</button>
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
            {!besvarad && <button className="knapp" style={{ background: barn.farg }} disabled={!skrivet.trim()}>Svara</button>}
          </form>
        ) : (
          (f.alternativ || []).map((a) => (
            <button key={a} onClick={() => svara(a)}
              className={`alt ${besvarad && a === f.ratt ? "ratt" : ""} ${besvarad && a === valt && a !== f.ratt ? "fel-val" : ""}`}>
              {a}
            </button>
          ))
        )}

        {besvarad && (
          <>
            <div className={`svar ${rattSvar ? "ratt" : "fel-val"}`}>
              <strong style={{ fontSize: 18 }}>{rattSvar ? "Rätt!" : `Rätt svar: ${f.ratt}`}</strong>
              <span>{f.forklaring}</span>
            </div>
            <button className="knapp" onClick={nasta}>{nr + 1 >= fragor.length ? "Se resultat" : "Nästa fråga"}</button>
          </>
        )}
      </div>
    </main>
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
