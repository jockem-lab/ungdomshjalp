// Felsökning: visar om inställningarna finns, utan att visa själva värdena.
// Med ?kod=<familjekoden> görs också ett litet testanrop till Claude.
import Anthropic from "@anthropic-ai/sdk";
import { kodStammer } from "../../../lib/kod";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const kod = String(process.env.FAMILJEKOD || "");
  const modell = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
  const svar = {
    version: "6",
    miljo: process.env.VERCEL_ENV || null,
    projekt: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
    familjekod_finns: kod.trim().length > 0,
    api_nyckel_finns: Boolean(process.env.ANTHROPIC_API_KEY),
    api_nyckel_borjar_med: String(process.env.ANTHROPIC_API_KEY || "").slice(0, 10),
    api_nyckel_langd: String(process.env.ANTHROPIC_API_KEY || "").length,
    modell,
  };
  const testKod = new URL(req.url).searchParams.get("kod");
  if (testKod !== null) {
    if (!kodStammer(testKod)) {
      svar.claude_test = "Fel familjekod, testet kördes inte.";
    } else {
      try {
        const r = await new Anthropic().messages.create({
          model: modell,
          max_tokens: 10,
          messages: [{ role: "user", content: "Svara bara: hej" }],
        });
        svar.claude_test = "OK: " + (r.content[0]?.text || "");
      } catch (e) {
        svar.claude_test = `FEL ${e?.status || ""}: ${String(e?.message || e).slice(0, 300)}`;
      }
    }
  }
  return Response.json(svar);
}
