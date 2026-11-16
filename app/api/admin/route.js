// Föräldravyn: hämtar alla barns träningspass och belöningar, och tar emot förälderns ändringar
// av stickers ("atgard"). Skyddas av ADMINKOD (inte familjekoden).
import { adminkodStammer } from "../../../lib/kod";
import { databasFinns } from "../../../lib/databas";
import { demoData, demoBelo } from "../../../lib/demologg";
import { lasLoggar, topplistaFranDatabas, topplistaUtanDatabas } from "../../../lib/topplista";
import { lasAllaBelo, andraBelo } from "../../../lib/belolagring";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (String(body.adminkod || "").trim().toLowerCase() === "demo") {
    // I testläget sparas inga ändringar här; föräldravyn ändrar bara på skärmen.
    const barn = demoData();
    return Response.json({ databas: true, demo: true, barn, topplista: topplistaUtanDatabas(barn), belo: demoBelo() });
  }
  if (!String(process.env.ADMINKOD || "").trim()) {
    return Response.json({ fel: "ADMINKOD saknas i Vercel. Lägg till den under Settings → Environment Variables och gör Redeploy." }, { status: 500 });
  }
  if (!adminkodStammer(body.adminkod)) return Response.json({ fel: "Fel föräldrakod." }, { status: 401 });
  if (!databasFinns()) return Response.json({ databas: false, barn: {} });
  try {
    if (body.atgard) {
      const fel = await andraBelo(body.atgard);
      if (fel) return Response.json({ fel }, { status: 400 });
    }
    const barn = await lasLoggar();
    return Response.json({ databas: true, barn, topplista: await topplistaFranDatabas(barn), belo: await lasAllaBelo() });
  } catch (e) {
    console.error("Admin-fel:", e.message);
    return Response.json({ fel: "Kunde inte läsa databasen just nu." }, { status: 502 });
  }
}
