// Kollar familjekoden när någon loggar in på en ny enhet.
import { kodStammer } from "../../../lib/kod";
import { arDemo } from "../../../lib/demo";

export async function POST(req) {
  const data = await req.clone().json().catch(() => ({}));
  if (arDemo(data.kod)) return Response.json({ ok: true, demo: true });
  if (!process.env.FAMILJEKOD) {
    return Response.json({ ok: false, fel: "FAMILJEKOD saknas i Vercel." }, { status: 500 });
  }
  const { kod } = await req.json();
  const ok = kodStammer(kod);
  return Response.json({ ok }, { status: ok ? 200 : 401 });
}
