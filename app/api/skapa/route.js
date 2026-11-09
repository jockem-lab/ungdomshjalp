// Serverdelen: tar emot foton + barnets id, frågar Claude och skickar tillbaka ett förhör.
// API-nyckeln finns bara här på servern (miljövariabeln ANTHROPIC_API_KEY), aldrig i webbläsaren.

import Anthropic from "@anthropic-ai/sdk";
import { hittaBarn } from "../../../lib/barn";
import { kodStammer } from "../../../lib/kod";

export const maxDuration = 60; // sekunder, så Vercel hinner vänta på svaret

const MODELL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

// Claude måste svara genom att "anropa" det här verktyget, då får vi alltid giltig JSON.
const FORHOR_VERKTYG = {
  name: "skapa_forhor",
  description: "Skapa ett läxförhör från elevens material.",
  input_schema: {
    type: "object",
    properties: {
      titel: { type: "string", description: "Kort titel på materialet, t.ex. 'Glosor vecka 46'" },
      amne: { type: "string", description: "Skolämne, t.ex. Matte, Engelska, SO" },
      sammanfattning: {
        type: "string",
        description: "2–4 meningar om vad materialet handlar om, skrivet direkt till eleven",
      },
      fragor: {
        type: "array",
        items: {
          type: "object",
          properties: {
            typ: { type: "string", enum: ["flerval", "skriv"] },
            fraga: { type: "string" },
            alternativ: {
              type: "array",
              items: { type: "string" },
              description: "Bara för flerval: 3–4 alternativ",
            },
            ratt: {
              type: "string",
              description: "Rätt svar. För flerval exakt samma text som rätt alternativ.",
            },
            godkanda: {
              type: "array",
              items: { type: "string" },
              description: "Bara för skriv: andra stavningar/formuleringar som också är rätt",
            },
            ledtrad: { type: "string", description: "En ledtråd som hjälper utan att avslöja svaret" },
            forklaring: { type: "string", description: "Kort förklaring som visas efter svaret" },
          },
          required: ["typ", "fraga", "ratt", "ledtrad", "forklaring"],
        },
      },
    },
    required: ["titel", "amne", "sammanfattning", "fragor"],
  },
};

function systemPrompt(barn, lage) {
  return `Du är en vänlig och pedagogisk hjälplärare för ${barn.namn}, ${barn.alder} år, i den svenska skolan.

Om ${barn.namn}: ${barn.larstil}

Regler:
- Du hjälper bara till med skolarbete. Utgå enbart från materialet eleven har fotat.
- Skriv på svenska (utom när själva övningen är på ett annat språk, t.ex. glosor).
- Anpassa språk och svårighet efter elevens ålder och beskrivningen ovan.
- Innehållet ska vara lämpligt för barn. Om bilderna inte innehåller skolmaterial: skapa inga frågor, sätt titeln till "Hittade inget skolmaterial" och be vänligt eleven fota en sida ur boken.
- Syftet är att eleven ska lära sig och träna, inte att få svaren serverade. Ledtrådar ska hjälpa eleven att tänka själv.
- Frågor av typen "skriv" ska ha korta svar (ett ord, ett tal eller en kort fras) så att de kan rättas automatiskt.

Läge: ${
    lage === "prov"
      ? "PROVTRÄNING. Gör 12 frågor som täcker hela materialet, från lätt till svårt, ungefär som ett riktigt prov."
      : "LÄXFÖRHÖR. Gör 8 frågor som förhör det viktigaste i materialet."
  }`;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ fel: "Bilderna var för stora eller kom inte fram. Prova med färre bilder." }, { status: 400 });
  }
  const { barnId, bilder, lage, anteckning } = body;

  // Enkel familjekod så att inte vem som helst kan använda er API-nyckel.
  // Koden skickas i själva meddelandet (inte i en header) så att å, ä och ö fungerar.
  if (!kodStammer(body.kod)) {
    console.warn("Fel familjekod vid skapa");
    return Response.json({ fel: "Fel familjekod." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ fel: "API-nyckeln saknas på servern." }, { status: 500 });
  }
  const barn = hittaBarn(barnId);
  if (!barn) return Response.json({ fel: "Okänt barn." }, { status: 400 });
  if (!Array.isArray(bilder) || bilder.length === 0 || bilder.length > 6) {
    return Response.json({ fel: "Skicka mellan 1 och 6 bilder." }, { status: 400 });
  }

  const innehall = bilder.map((dataUrl) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: String(dataUrl).replace(/^data:image\/\w+;base64,/, ""),
    },
  }));
  innehall.push({
    type: "text",
    text:
      "Här är mitt material." +
      (anteckning ? ` Det här vill jag träna på: ${String(anteckning).slice(0, 300)}` : ""),
  });

  try {
    const client = new Anthropic();
    const svar = await client.messages.create({
      model: MODELL,
      max_tokens: 4000,
      system: systemPrompt(barn, lage),
      tools: [FORHOR_VERKTYG],
      tool_choice: { type: "tool", name: "skapa_forhor" },
      messages: [{ role: "user", content: innehall }],
    });
    const verktyg = svar.content.find((c) => c.type === "tool_use");
    if (!verktyg) throw new Error("Inget förhör i svaret");
    return Response.json(verktyg.input);
  } catch (e) {
    console.error(e);
    return Response.json({ fel: "Hjälpläraren kunde inte svara just nu. Försök igen." }, { status: 502 });
  }
}
