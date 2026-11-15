// Synkar barnets belöningar med databasen så att föräldravyn ser dem. Kräver familjekoden.
// Mobilen skickar sitt läge och får tillbaka det sammanslagna läget och förälderns justering.
import { kodStammer } from "../../../lib/kod";
import { arDemo } from "../../../lib/demo";
import { hittaBarn } from "../../../lib/barn";
import { databasFinns } from "../../../lib/databas";
import { synkaBelo } from "../../../lib/belolagring";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (arDemo(body.kod)) return Response.json({ synkat: false, demo: true }); // testläget stannar på enheten
  if (!kodStammer(body.kod)) return Response.json({ fel: "Fel familjekod." }, { status: 401 });
  if (!hittaBarn(body.barnId)) return Response.json({ fel: "Okänt barn." }, { status: 400 });
  if (!databasFinns()) return Response.json({ synkat: false, orsak: "ingen databas" });
  try {
    return Response.json({ synkat: true, ...(await synkaBelo(body.barnId, body.belo)) });
  } catch (e) {
    console.error("Belo-fel:", e.message);
    return Response.json({ synkat: false }, { status: 502 });
  }
}
