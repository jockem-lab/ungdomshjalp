"use client";

// Hela appen är en sida med flera "skärmar": login → välj barn → hem → fota → förhör.
// Förhören sparas i webbläsaren på den enhet barnet använder (localStorage).

import { useEffect, useState } from "react";
import { BARN, hittaBarn } from "../lib/barn";
import { TYPER, SPRAK, STANDARD_AMNEN, sprakNamn } from "../lib/amnen";
import { arDemo } from "../lib/demo";
import { npForBarn } from "../lib/np";

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

function lasUpp(text, sprak = "sv-SE") {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = sprak || "sv-SE";
    const rost = window.speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(u.lang.slice(0, 2)));
    if (rost) u.voice = rost;
    u.rate = sprak && sprak !== "sv-SE" ? 0.85 : 0.95;
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
  const [amnen, setAmnen] = useState(STANDARD_AMNEN);
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
    }
  }, [barnId, prefix]);

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
        <div className="testband">Testläge: påhittade förhör, inga krediter används</div>
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

  if (skarm === "fota") {
    return (
      <Fota
        barn={barn}
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
      onByt={() => setSkarm("valj")}
      onFota={() => setSkarm("fota")}
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

function amnesEtikett(m) {
  return m.amneNamn || m.amne || "Övrigt";
}

function Hem({ barn, material, onByt, onFota, onStarta, onTaBort, onAmnen, onNp }) {
  const np = npForBarn(barn.arskurs);
  const [filter, setFilter] = useState(null);
  const amnesNamn = [...new Set(material.map(amnesEtikett))];
  const visade = filter ? material.filter((m) => amnesEtikett(m) === filter) : material;

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
        {np && (
          <button className="knapp ram" onClick={onNp} style={{ flexDirection: "column", gap: 2, borderColor: barn.farg }}>
            Träna på nationella prov
            <span className="dov" style={{ fontWeight: 600 }}>{np.iforvag ? `Inför åk ${np.ak}` : `Åk ${np.ak}`}: {np.amnen.slice(0, 3).join(", ")}{np.amnen.length > 3 ? " m.fl." : ""}</span>
          </button>
        )}
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
        {material.length === 0 && <p className="dov">Här hamnar allt du fotar. Börja med knappen ovanför.</p>}
        {visade.map((m) => (
          <div className="kort" key={m.id}>
            <span className="amne" style={{ color: barn.farg }}>{amnesEtikett(m)} · {m.lage === "prov" ? "Provträning" : "Läxförhör"}</span>
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

function NationellaProv({ barn, kod, onTillbaka, onKlar, onFelKod }) {
  const np = npForBarn(barn.arskurs);
  const [amne, setAmne] = useState(null);
  const [vantar, setVantar] = useState(false);
  const [fel, setFel] = useState("");

  async function starta() {
    setVantar(true);
    setFel("");
    try {
      const data = await hamtaForhor({ kod, barnId: barn.id, np: { ak: np.ak, amne } }, onFelKod);
      if (!data) return;
      onKlar({
        ...data,
        id: Date.now().toString(36),
        lage: "prov",
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
        <p className="dov">Proven är egna övningsuppgifter i samma stil som de riktiga, inte de riktiga proven. Svenska och engelska börjar med en text att läsa (eller lyssna på).</p>
        {fel && <p className="fel">{fel}</p>}
        <button className="knapp" style={{ background: barn.farg, marginTop: "auto" }} disabled={!amne} onClick={starta}>
          Starta övningsprov
        </button>
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

function Fota({ barn, kod, amnen, onNyttAmne, onTillbaka, onKlar, onFelKod }) {
  const [bilder, setBilder] = useState([]);
  const [lage, setLage] = useState("forhor");
  const [anteckning, setAnteckning] = useState("");
  const [vantar, setVantar] = useState(false);
  const [fel, setFel] = useState("");
  const [amneId, setAmneId] = useState(null);
  const [nyttAmne, setNyttAmne] = useState(false);
  const amne = amnen.find((a) => a.id === amneId);

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
        body: JSON.stringify({ kod, barnId: barn.id, bilder, lage, anteckning, amne }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) { alert("Familjekoden stämmer inte längre. Skriv in den igen."); return onFelKod(); }
      if (r.status === 413) throw new Error("Bilderna är för stora. Prova med färre bilder.");
      if (r.status === 504) throw new Error("Det tog för lång tid. Prova med färre bilder eller försök igen.");
      if (!r.ok) throw new Error(data.fel || `Något gick fel (felkod ${r.status}).`);
      if (!data.fragor || data.fragor.length === 0) {
        throw new Error(data.sammanfattning || "Hittade inga frågor att göra. Prova att fota tydligare.");
      }
      onKlar({
        ...data,
        id: Date.now().toString(36),
        lage,
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
        <label className="etikett">
          Vad vill du träna på? (valfritt)
          <input className="falt" value={anteckning} onChange={(e) => setAnteckning(e.target.value)} placeholder={amne?.typ === "sprak" ? "t.ex. glosorna svenska till engelska" : amne?.typ === "matte" ? "t.ex. bråk med olika nämnare" : "t.ex. kapitel 3 om vikingatiden"} />
        </label>
        {fel && <p className="fel">{fel}</p>}
        {bilder.length > 0 && !amne && <p className="dov" style={{ textAlign: "center" }}>Välj ett ämne först.</p>}
        <button className="knapp" style={{ background: barn.farg, marginTop: "auto" }} disabled={bilder.length === 0 || !amne} onClick={skapa}>
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
        {nr === 0 && !besvarad && punkter.length === 0 && !lastext && <p className="dov">{forhor.sammanfattning}</p>}
        {lastext && (
          <details className="kort">
            <summary style={{ fontWeight: 800, cursor: "pointer" }}>Visa texten igen</summary>
            <p className="lastext">{lastext}</p>
          </details>
        )}
        <div className="kort">
          <span className="amne" style={{ color: barn.farg }}>{forhor.amneNamn || forhor.amne}</span>
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

function HogtalarIkon({ storlek = 18 }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
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
