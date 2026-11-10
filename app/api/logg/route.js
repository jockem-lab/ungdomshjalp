// Sparar ett träningspass (förhör eller bläddrakort) så att föräldravyn kan visa det.
import { kodStammer } from "../../../lib/kod";
import { arDemo } from "../../../lib/demo";
import { hittaBarn } from "../../../lib/barn";
import { databasFinns, redis, MAX_POSTER } from "../../../lib/databas";

export const dynamic = "force-dynamic";

const text = (v, max) => String(v ?? "").slice(0, max);
const tal = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ fel: "Trasigt anrop." }, { status: 400 });
  }
  if (arDemo(body.kod)) return Response.json({ sparat: false, demo: true }); // testläget sparas inte
  if (!kodStammer(body.kod)) return Response.json({ fel: "Fel familjekod." }, { status: 401 });
  if (!hittaBarn(body.barnId)) return Response.json({ fel: "Okänt barn." }, { status: 400 });
  if (!databasFinns()) return Response.json({ sparat: false, orsak: "ingen databas" });

  const post = {
    tid: new Date(Number(body.start) || Date.now()).toISOString(),
    typ: body.typ === "kort" ? "kort" : "forhor",
    amne: text(body.amne, 60),
    titel: text(body.titel, 120),
    lage: text(body.lage, 10),
    np: Boolean(body.np),
    sekunder: tal(body.sekunder, 0, 4 * 3600),
    antal: tal(body.antal, 0, 200),
    ratt: tal(body.ratt, 0, 200),
    besvarade: tal(body.besvarade, 0, 200),
    klar: Boolean(body.klar),
  };
  if (post.sekunder < 5) return Response.json({ sparat: false, orsak: "för kort" });
  try {
    const nyckel = `logg:${body.barnId}`;
    await redis([["LPUSH", nyckel, JSON.stringify(post)], ["LTRIM", nyckel, 0, MAX_POSTER - 1]]);
    return Response.json({ sparat: true });
  } catch (e) {
    console.error("Logg-fel:", e.message);
    return Response.json({ sparat: false }, { status: 502 });
  }
}
