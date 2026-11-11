// Föräldravyn: hämtar alla barns träningspass. Skyddas av ADMINKOD (inte familjekoden).
import { adminkodStammer } from "../../../lib/kod";
import { BARN } from "../../../lib/barn";
import { databasFinns } from "../../../lib/databas";
import { demoData } from "../../../lib/demologg";
import { lasLoggar, topplistaFranDatabas, topplistaUtanDatabas } from "../../../lib/topplista";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (String(body.adminkod || "").trim().toLowerCase() === "demo") {
    const barn = demoData();
    return Response.json({ databas: true, demo: true, barn, topplista: topplistaUtanDatabas(barn) });
  }
  if (!String(process.env.ADMINKOD || "").trim()) {
    return Response.json({ fel: "ADMINKOD saknas i Vercel. Lägg till den under Settings → Environment Variables och gör Redeploy." }, { status: 500 });
  }
  if (!adminkodStammer(body.adminkod)) return Response.json({ fel: "Fel föräldrakod." }, { status: 401 });
  if (!databasFinns()) return Response.json({ databas: false, barn: {} });
  try {
    const barn = await lasLoggar();
    return Response.json({ databas: true, barn, topplista: await topplistaFranDatabas(barn) });
  } catch (e) {
    console.error("Admin-fel:", e.message);
    return Response.json({ fel: "Kunde inte läsa databasen just nu." }, { status: 502 });
  }
}
