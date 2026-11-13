// Felsökning: visar om servern kan hämta och läsa ett gammalt nationellt prov från Skolverket.
// Exempel: /api/gamlaprov?ak=9&amne=Biologi  Visar bara filnamn och hur mycket text som hittades.

import { gammaltProv } from "../../../lib/gamlaprov";
import { hamtaGammaltProv } from "../../../lib/gamlaprovHamta";

export const maxDuration = 60;

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const prov = gammaltProv(p.get("ak"), p.get("amne") || "");
  if (!prov?.fil) return Response.json({ ok: false, fel: "Inget gammalt prov för den årskursen och det ämnet." }, { status: 404 });
  try {
    const d = await hamtaGammaltProv(prov.fil);
    return Response.json({
      ok: true,
      filer_i_zip: d.filnamn.length,
      filnamn: d.filnamn.slice(0, 60),
      texter: d.texter.map((t) => ({ namn: t.namn, tecken: t.text.length })),
      pdfer: d.pdfer.map((x) => x.namn),
    });
  } catch (e) {
    return Response.json({ ok: false, fel: String(e?.message || e) }, { status: 502 });
  }
}
