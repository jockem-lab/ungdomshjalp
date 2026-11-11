// Veckans topplista och barnens hemliga stickers. Kräver familjekoden.
import { kodStammer } from "../../../lib/kod";
import { arDemo } from "../../../lib/demo";
import { databasFinns } from "../../../lib/databas";
import { demoData } from "../../../lib/demologg";
import { lasLoggar, topplistaFranDatabas, topplistaUtanDatabas } from "../../../lib/topplista";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (arDemo(body.kod)) return Response.json({ databas: true, demo: true, ...topplistaUtanDatabas(demoData()) });
  if (!kodStammer(body.kod)) return Response.json({ fel: "Fel familjekod." }, { status: 401 });
  if (!databasFinns()) return Response.json({ databas: false });
  try {
    return Response.json({ databas: true, ...(await topplistaFranDatabas(await lasLoggar())) });
  } catch (e) {
    console.error("Topplista-fel:", e.message);
    return Response.json({ fel: "Kunde inte läsa topplistan just nu." }, { status: 502 });
  }
}
