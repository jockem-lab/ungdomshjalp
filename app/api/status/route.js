// Felsökning: visar om inställningarna finns, utan att visa själva värdena.
export const dynamic = "force-dynamic";

export async function GET() {
  const nyckel = String(process.env.ANTHROPIC_API_KEY || "");
  return Response.json({
    version: "8",
    miljo: process.env.VERCEL_ENV || null,
    projekt: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
    familjekod_finns: String(process.env.FAMILJEKOD || "").trim().length > 0,
    api_nyckel_finns: nyckel.length > 0,
    modell: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
  });
}
