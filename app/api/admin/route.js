// Föräldravyn: hämtar alla barns träningspass. Skyddas av ADMINKOD (inte familjekoden).
import { adminkodStammer } from "../../../lib/kod";
import { BARN } from "../../../lib/barn";
import { databasFinns, redis } from "../../../lib/databas";

export const dynamic = "force-dynamic";

// Påhittad historik för testläget (adminkod "demo"), så att vyn kan provas utan databas.
function demoData() {
  const amnen = ["Matte", "Engelska", "SO", "Svenska", "NO"];
  const ut = {};
  let fro = 7;
  for (const b of BARN) {
    const lista = [];
    for (let i = 0; i < 18; i++) {
      fro = (fro * 9301 + 49297) % 233280;
      const dagar = Math.floor((fro / 233280) * 21);
      const amne = amnen[(i + b.namn.length) % amnen.length];
      const antal = 8 + (i % 5);
      lista.push({
        tid: new Date(Date.now() - dagar * 86400000 - i * 3600000).toISOString(),
        typ: i % 4 === 0 ? "kort" : "forhor",
        amne,
        titel: `TESTLÄGE: exempelpass i ${amne}`,
        lage: i % 3 === 0 ? "prov" : "forhor",
        np: i % 7 === 0,
        sekunder: 240 + ((fro >> 3) % 900),
        antal,
        ratt: Math.max(0, antal - (i % 4)),
        besvarade: i % 6 !== 5 ? antal : antal - 4,
        klar: i % 6 !== 5,
      });
    }
    ut[b.id] = lista.sort((a, c) => c.tid.localeCompare(a.tid));
  }
  return ut;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (String(body.adminkod || "").trim().toLowerCase() === "demo") {
    return Response.json({ databas: true, demo: true, barn: demoData() });
  }
  if (!String(process.env.ADMINKOD || "").trim()) {
    return Response.json({ fel: "ADMINKOD saknas i Vercel. Lägg till den under Settings → Environment Variables och gör Redeploy." }, { status: 500 });
  }
  if (!adminkodStammer(body.adminkod)) return Response.json({ fel: "Fel föräldrakod." }, { status: 401 });
  if (!databasFinns()) return Response.json({ databas: false, barn: {} });
  try {
    const svar = await redis(BARN.map((b) => ["LRANGE", `logg:${b.id}`, 0, 1999]));
    const barn = {};
    BARN.forEach((b, i) => {
      barn[b.id] = (svar[i] || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    });
    return Response.json({ databas: true, barn });
  } catch (e) {
    console.error("Admin-fel:", e.message);
    return Response.json({ fel: "Kunde inte läsa databasen just nu." }, { status: 502 });
  }
}
