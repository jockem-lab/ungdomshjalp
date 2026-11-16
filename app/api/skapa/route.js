// Serverdelen: tar emot foton + barnets id, frågar Claude och skickar tillbaka ett förhör.
// API-nyckeln finns bara här på servern (miljövariabeln ANTHROPIC_API_KEY), aldrig i webbläsaren.

import Anthropic from "@anthropic-ai/sdk";
import { hittaBarn } from "../../../lib/barn";
import { kodStammer } from "../../../lib/kod";
import { tvattaAmne, sprakNamn } from "../../../lib/amnen";
import { arDemo, demoForhor } from "../../../lib/demo";
import { giltigtNp } from "../../../lib/np";
import { gammaltProv, kanTranaGammalt } from "../../../lib/gamlaprov";
import { hamtaGammaltProv } from "../../../lib/gamlaprovHamta";
import { tvattaNiva, nivaInstruktion } from "../../../lib/niva";

export const maxDuration = 120; // sekunder, så Vercel hinner hämta gamla prov och vänta på svaret

const MODELL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

// Claude måste svara med JSON som följer det här schemat ("structured outputs").
const FORHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    titel: { type: "string", description: "Kort titel på materialet, t.ex. 'Glosor vecka 46'" },
    amne: { type: "string", description: "Skolämne, t.ex. Matte, Engelska, SO" },
    sammanfattning: {
      type: "string",
      description: "2–4 meningar om vad materialet handlar om, skrivet direkt till eleven",
    },
    lastext: {
      type: "string",
      description: "En lästext som frågorna bygger på (läsförståelse/hörförståelse). Tom sträng om ingen.",
    },
    lastext_sprak: { type: "string", description: "Språkkod för lastext, t.ex. sv-SE eller en-GB. Tom sträng om ingen lästext." },
    nyckelpunkter: {
      type: "array",
      items: { type: "string" },
      description: "Det viktigaste att kunna, en kort mening per punkt. Tom lista om ämnet inte ska ha det.",
    },
    fragor: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          typ: { type: "string", enum: ["flerval", "skriv"] },
          fraga: { type: "string" },
          alternativ: {
            type: "array",
            items: { type: "string" },
            description: "För flerval: 3–4 alternativ. För skriv: tom lista.",
          },
          ratt: {
            type: "string",
            description: "Rätt svar. För flerval exakt samma text som rätt alternativ.",
          },
          godkanda: {
            type: "array",
            items: { type: "string" },
            description: "För skriv: andra stavningar/formuleringar som också är rätt. Annars tom lista.",
          },
          ledtrad: { type: "string", description: "En ledtråd som hjälper utan att avslöja svaret" },
          forklaring: { type: "string", description: "Kort förklaring som visas efter svaret" },
          lasupp: {
            type: "string",
            description: "Ord eller fras på det främmande språket som ska kunna spelas upp. Annars tom sträng.",
          },
          lasupp_sprak: { type: "string", description: "Språkkod för lasupp, t.ex. en-GB. Annars tom sträng." },
          niva: { type: "string", enum: ["E", "C", "A"], description: "Vilket betygssteg frågan motsvarar" },
        },
        required: ["typ", "fraga", "alternativ", "ratt", "godkanda", "ledtrad", "forklaring", "lasupp", "lasupp_sprak", "niva"],
      },
    },
  },
  required: ["titel", "amne", "sammanfattning", "lastext", "lastext_sprak", "nyckelpunkter", "fragor"],
};

// Olika upplägg beroende på vilket slags ämne barnet har valt.
function amnesInstruktion(amne) {
  if (amne.typ === "sprak") {
    const sprak = sprakNamn(amne.sprak) || "språket";
    if (amne.sprak === "sv-SE") {
      return `Ämnet är "${amne.namn}" (svenska). Träna stavning, ordförståelse och grammatik utifrån materialet. Ge många korta skrivsvar så att eleven tränar att skriva rätt. När en fråga handlar om hur ett ord låter eller stavas: lägg ordet i "lasupp" och "sv-SE" i "lasupp_sprak". "nyckelpunkter" får vara tom.`;
    }
    return `Ämnet är "${amne.namn}", ett språk (${sprak}). Gör glosförhör åt båda hållen (svenska → ${sprak} och ${sprak} → svenska), fyll-i-luckan och korta skrivsvar så att eleven tränar stavning. Ställ frågorna på svenska. I VARJE fråga där ett ord eller en fras på ${sprak} förekommer i frågan eller svaret: lägg just det ordet/frasen på ${sprak} i "lasupp" och "${amne.sprak}" i "lasupp_sprak", så att eleven kan lyssna på uttalet. "nyckelpunkter" får vara tom.`;
  }
  if (amne.typ === "lasamne") {
    return `Ämnet är "${amne.namn}", ett läsämne. Skriv först 4–6 "nyckelpunkter" som sammanfattar det viktigaste i materialet med enkla ord. Frågorna ska vara sammanfattande och pröva förståelse: begrepp, samband, orsak och verkan och varför saker är som de är, inte små detaljer. Blanda flerval med korta svar. "lasupp" lämnas tom.`;
  }
  if (amne.typ === "matte") {
    return `Ämnet är "${amne.namn}" (matte). Gör egna uppgifter av samma slag som i materialet men med andra tal, så att eleven tränar metoden och inte bara minns svaren. Använd "skriv" när svaret är ett tal. Förklaringen ska visa uträkningen steg för steg. "nyckelpunkter" får innehålla 1–3 regler eller metoder att komma ihåg. "lasupp" lämnas tom.`;
  }
  return `Ämnet är "${amne.namn}". Gör ett blandat förhör om det viktigaste i materialet. "nyckelpunkter" får innehålla en kort sammanfattning i punktform. "lasupp" lämnas tom om det inte finns främmande ord.`;
}

// Övningsprov i stil med de nationella proven. Claude skriver egna uppgifter.
function npInstruktion(np) {
  const bas = `Gör ett ÖVNINGSPROV inför det nationella provet i ${np.amne} för årskurs ${np.ak}. Skriv egna uppgifter i samma stil och på samma nivå som de nationella proven och kunskapskraven i Lgr22 för åk ${np.ak}. Kopiera aldrig riktiga provuppgifter. Det finns inget fotat material. Gör 12 frågor från lätt till svår.`;
  if (np.amne === "Svenska") {
    return `${bas} Skriv en lästext på svenska i "lastext" (åk 3: ca 120 ord, åk 6: ca 300 ord, åk 9: ca 450 ord; berättande eller faktatext), "lastext_sprak" = "sv-SE". Ungefär 8 frågor ska pröva läsförståelse av texten (hitta information, dra slutsatser, tolka), resten språkriktighet, ordförståelse och stavning med korta skrivsvar. "nyckelpunkter" = 2–3 tips för hur man löser läsförståelseuppgifter.`;
  }
  if (np.amne === "Engelska") {
    return `${bas} Skriv en text på engelska i "lastext" (åk 6: ca 200 ord, åk 9: ca 350 ord), "lastext_sprak" = "en-GB". Eleven kan både läsa och lyssna på den. Ungefär 7 frågor ska pröva läs- och hörförståelse av texten, resten ordförråd och grammatik. Frågorna får vara på engelska. Lägg engelska ord som eleven kan behöva höra i "lasupp" med "en-GB". "nyckelpunkter" = 2–3 tips på svenska.`;
  }
  if (np.amne === "Matte") {
    return `${bas} Blanda områdena taluppfattning, algebra, geometri, mätning, statistik och sannolikhet${np.ak === 3 ? " (på åk 3-nivå: tal, enkla räknesätt, mätning, geometriska former, enkla mönster)" : ""}, med några textuppgifter/problemlösning. Använd "skriv" när svaret är ett tal och skriv i frågan vilken enhet som ska anges. Förklaringen visar uträkningen steg för steg. "lastext" tom. "nyckelpunkter" = 3–4 saker att komma ihåg till provet.`;
  }
  return `${bas} Utgå från det centrala innehållet i ${np.amne} för åk 7–9. Frågorna ska pröva begrepp, samband och förmåga att resonera, inte bara faktakunskap. Får gärna ha en kort källtext eller ett scenario i "lastext" ("sv-SE") som några frågor bygger på. "nyckelpunkter" = 4–6 centrala begrepp eller samband att kunna.`;
}

// Förhör byggt på ett riktigt, gammalt nationellt prov som Skolverket släppt fritt.
function gammaltInstruktion(np) {
  const prov = gammaltProv(np.ak, np.amne);
  const ar = prov?.ar ? ` (${prov.ar})` : "";
  const delar = np.ak === 3
    ? ` Filen innehåller både matte och svenska/svenska som andraspråk: använd BARA delarna i ${np.amne === "Matte" ? "matematik" : "svenska (inte svenska som andraspråk)"}.`
    : np.amne === "Svenska" ? " Filen kan innehålla både svenska och svenska som andraspråk: använd delarna i svenska." : "";
  return `Eleven ska träna på ett GAMMALT NATIONELLT PROV i ${np.amne} för årskurs ${np.ak}${ar}. Skolverket har släppt det fritt från sekretess och det får användas. Provet finns i de bifogade dokumenten: PDF:en är själva provet (elevens provhäfte). Word-texterna är lärarinstruktioner för provet; där kan facit, bedömning och uppgifter som läraren läser upp finnas, men frågorna ska bygga på elevens provhäfte.${delar}

Gör ett förhör med 12 frågor som bygger på provets RIKTIGA uppgifter, från lätt till svår:
- Använd provets egna uppgifter så nära originalet som går, men gör om dem till flerval eller korta skrivsvar så att de kan rättas automatiskt. Hoppa över uppgifter som kräver en bild som saknas, långa skrivuppgifter, muntliga delar och ljudfiler.
- Om provet har en lästext: lägg ett lagom långt utdrag (högst ca 500 ord, välj ett sammanhängande stycke som frågorna bygger på) i "lastext" och rätt språkkod i "lastext_sprak". Annars tom.
- Om provet har facit eller bedömningsanvisningar: använd dem för "ratt" och "forklaring". Annars räkna/resonera fram svaret själv och var noga.
- Skriv i "sammanfattning" att det här är uppgifter från det nationella provet${ar} och vad provet testar.
- "nyckelpunkter" = 3–4 tips inför provet utifrån vad just det här provet krävde.
- Om dokumenten inte verkar innehålla något prov i ${np.amne}: gör i stället egna uppgifter i samma stil och skriv det i sammanfattningen.`;
}

function systemPrompt(barn, lage, amne, np, niva) {
  return `Du är en vänlig och pedagogisk hjälplärare för ${barn.namn}, ${barn.alder} år, som går i årskurs ${barn.arskurs} i den svenska skolan.

Om ${barn.namn}: ${barn.larstil}

Regler:
- Du hjälper bara till med skolarbete.${np ? "" : " Utgå enbart från materialet eleven har fotat eller laddat upp (bilder och/eller filer)."}
- Skriv på svenska (utom när själva övningen är på ett annat språk, t.ex. glosor).
- Anpassa språk och svårighet efter elevens ålder och beskrivningen ovan.
- Innehållet ska vara lämpligt för barn. Om materialet inte innehåller skolmaterial: skapa inga frågor, sätt titeln till "Hittade inget skolmaterial" och be vänligt eleven fota en sida ur boken.
- Syftet är att eleven ska lära sig och träna, inte att få svaren serverade. Ledtrådar ska hjälpa eleven att tänka själv.
- Frågor av typen "skriv" ska ha korta svar (ett ord, ett tal eller en kort fras) så att de kan rättas automatiskt.

${np?.gammalt ? gammaltInstruktion(np) : np ? npInstruktion(np) : amnesInstruktion(amne)}

${nivaInstruktion(niva, barn.arskurs)}

${np ? "" : "Läge: "}${
    np ? ""
    : lage === "prov"
      ? "PROVTRÄNING. Gör 12 frågor som täcker hela materialet, från lätt till svårt, ungefär som ett riktigt prov."
      : "LÄXFÖRHÖR. Gör 8 frågor som förhör det viktigaste i materialet."
  }`;
}

// Gör om fel från Claude till något en förälder kan förstå och åtgärda.
function forklaraFel(e) {
  const status = e?.status;
  const text = String(e?.message || "");
  if (/credit balance|billing|purchase credits/i.test(text)) {
    return "Kontot hos Anthropic saknar krediter. En förälder behöver fylla på under Billing på console.anthropic.com.";
  }
  if (status === 401) return "API-nyckeln fungerar inte. En förälder behöver kolla ANTHROPIC_API_KEY i Vercel.";
  if (status === 403) return "API-nyckeln saknar behörighet. En förälder behöver kolla kontot på console.anthropic.com.";
  if (status === 404) return `Modellen hittades inte (${MODELL}). En förälder behöver kolla inställningen CLAUDE_MODEL.`;
  if (status === 413) return "Bilderna är för stora. Prova med färre bilder.";
  if (status === 429) return "För många förfrågningar just nu, eller så är månadsgränsen nådd. Vänta en stund och försök igen.";
  if (status === 529 || status >= 500) return "Claude är överbelastad just nu. Försök igen om en liten stund.";
  return `Hjälpläraren kunde inte svara (${status || "okänt fel"}: ${text.slice(0, 160)})`;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ fel: "Bilderna var för stora eller kom inte fram. Prova med färre bilder." }, { status: 400 });
  }
  const { barnId, bilder, lage, anteckning } = body;
  const np = body.np && giltigtNp(Number(body.np.ak), String(body.np.amne))
    ? { ak: Number(body.np.ak), amne: String(body.np.amne) }
    : null;
  if (np && body.np.gammalt && kanTranaGammalt(np.ak, np.amne)) np.gammalt = true;
  const amne = np
    ? { namn: `Nationellt prov ${np.amne}`, typ: np.amne === "Engelska" ? "sprak" : "annat", sprak: np.amne === "Engelska" ? "en-GB" : "" }
    : tvattaAmne(body.amne);

  // Testläge: påhittat förhör, Claude anropas inte.
  if (arDemo(body.kod)) {
    await new Promise((r) => setTimeout(r, 1500));
    return Response.json(demoForhor(amne, np));
  }

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
  const bildLista = Array.isArray(bilder) ? bilder.slice(0, 6) : [];
  // Filer (PDF som base64, Word/PowerPoint som utplockad text) från t.ex. Google Classroom.
  const filLista = (Array.isArray(body.filer) ? body.filer : [])
    .filter((f) => f && (f.typ === "pdf" || f.typ === "text") && typeof f.data === "string")
    .slice(0, 3);
  if (!np && bildLista.length + filLista.length === 0) {
    return Response.json({ fel: "Lägg till minst en bild eller fil." }, { status: 400 });
  }

  const filBlock = filLista.map((f) =>
    f.typ === "pdf"
      ? {
          type: "document",
          title: String(f.namn || "Fil").slice(0, 100),
          source: { type: "base64", media_type: "application/pdf", data: f.data.replace(/^data:[^;]+;base64,/, "") },
        }
      : {
          type: "document",
          title: String(f.namn || "Fil").slice(0, 100),
          source: { type: "text", media_type: "text/plain", data: f.data.slice(0, 60000) },
        }
  );
  const innehall = [...filBlock, ...bildLista.map((dataUrl) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: String(dataUrl).replace(/^data:image\/\w+;base64,/, ""),
    },
  }))];
  // Gammalt nationellt prov: hämta det från Skolverket nu (finns inte i repot).
  let reserv = false;
  if (np?.gammalt) {
    try {
      const prov = await hamtaGammaltProv(gammaltProv(np.ak, np.amne).fil);
      for (const t of prov.texter) {
        innehall.push({ type: "document", title: t.namn.split("/").pop().slice(0, 100), source: { type: "text", media_type: "text/plain", data: t.text } });
      }
      for (const p of prov.pdfer) {
        innehall.push({ type: "document", title: p.namn.split("/").pop().slice(0, 100), source: { type: "base64", media_type: "application/pdf", data: p.base64 } });
      }
    } catch (e) {
      // Går det inte att hämta provet blir det ett vanligt övningsprov i samma stil.
      console.error("Gammalt prov:", e?.message);
      np.gammalt = false;
      reserv = true;
    }
  }
  innehall.push({
    type: "text",
    text:
      (np?.gammalt ? `Gör mitt förhör på det gamla nationella provet i ${np.amne} för åk ${np.ak}.` : np ? `Gör mitt övningsprov i ${np.amne} för åk ${np.ak}.` : "Här är mitt material.") +
      (anteckning ? ` Det här vill jag träna på: ${String(anteckning).slice(0, 300)}` : ""),
  });

  try {
    const client = new Anthropic();
    const svar = await client.messages.create({
      model: MODELL,
      max_tokens: 8000,
      system: systemPrompt(barn, lage, amne, np, tvattaNiva(body.niva)),
      output_config: { format: { type: "json_schema", schema: FORHOR_SCHEMA } },
      messages: [{ role: "user", content: innehall }],
    });
    const text = svar.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    if (!text) throw new Error("Inget förhör i svaret");
    const forhor = JSON.parse(text);
    if (reserv) forhor.reserv = "Det gamla provet gick inte att hämta från Skolverket just nu, så du fick ett övningsprov i samma stil i stället.";
    if (np?.gammalt) forhor.gammalt = true;
    return Response.json(forhor);
  } catch (e) {
    console.error("Claude-fel:", e?.status, e?.message);
    return Response.json({ fel: forklaraFel(e) }, { status: 502 });
  }
}
