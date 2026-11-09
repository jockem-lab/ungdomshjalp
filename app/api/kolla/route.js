// Kollar familjekoden när någon loggar in på en ny enhet.
import { kodStammer } from "../../../lib/kod";

export async function POST(req) {
  if (!process.env.FAMILJEKOD) {
    return Response.json({ ok: false, fel: "FAMILJEKOD saknas i Vercel." }, { status: 500 });
  }
  const { kod } = await req.json();
  const ok = kodStammer(kod);
  return Response.json({ ok }, { status: ok ? 200 : 401 });
}
