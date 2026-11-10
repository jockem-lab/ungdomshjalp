// "Förklara igen": barnet ber hjälpläraren förklara en fråga på ett annat sätt.
import Anthropic from "@anthropic-ai/sdk";
import { hittaBarn } from "../../../lib/barn";
import { kodStammer } from "../../../lib/kod";
import { arDemo } from "../../../lib/demo";

export const maxDuration = 60;
const MODELL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const barn = hittaBarn(body.barnId);
  if (!barn) return Response.json({ fel: "Okänt barn." }, { status: 400 });
  const f = body.fraga || {};
  const kort = (x, n = 600) => String(x || "").slice(0, n);

  if (arDemo(body.kod)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({
      text: `TESTLÄGE: här skulle hjälpläraren förklara "${kort(f.fraga, 80)}" på ett nytt sätt, anpassat för ${barn.namn}. Rätt svar är ${kort(f.ratt, 80)}.`,
    });
  }
  if (!kodStammer(body.kod)) return Response.json({ fel: "Fel familjekod." }, { status: 401 });

  const system = `Du är en tålmodig och vänlig hjälplärare för ${barn.namn}, ${barn.alder} år, åk ${barn.arskurs}. Om eleven: ${barn.larstil}
Eleven har just svarat på en fråga och vill ha en ny förklaring. Förklara på ett ANNAT sätt än den förklaring eleven redan fått: använd ett vardagligt exempel, en jämförelse eller dela upp det i små steg. Skriv på svenska, kort (högst 120 ord), enkelt för elevens ålder. Ingen markdown, inga rubriker. Avsluta gärna med en liten kontrollfråga eleven kan fundera på. Håll dig till skolämnet.`;
  const fragaText = `Fråga: ${kort(f.fraga)}
Rätt svar: ${kort(f.ratt)}
Mitt svar: ${kort(body.mittSvar) || "(inget)"}
Förklaringen jag fick: ${kort(f.forklaring)}
${body.undran ? `Det här förstår jag inte: ${kort(body.undran, 300)}` : "Kan du förklara på ett annat sätt?"}`;

  try {
    const svar = await new Anthropic().messages.create({
      model: MODELL,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: fragaText }],
    });
    const text = svar.content.filter((c) => c.type === "text").map((c) => c.text).join("").trim();
    return Response.json({ text });
  } catch (e) {
    console.error("Förklara-fel:", e?.status, e?.message);
    return Response.json({ fel: "Hjälpläraren kunde inte svara just nu. Försök igen." }, { status: 502 });
  }
}
