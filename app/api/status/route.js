// Felsökning: visar om inställningarna finns, utan att visa själva värdena.
export const dynamic = "force-dynamic";

export async function GET() {
  const nyckel = String(process.env.ANTHROPIC_API_KEY || "");
  return Response.json({
    version: "9",
    miljo: process.env.VERCEL_ENV || null,
    projekt: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
    familjekod_finns: String(process.env.FAMILJEKOD || "").trim().length > 0,
    api_nyckel_finns: nyckel.length > 0,
    adminkod_finns: String(process.env.ADMINKOD || "").trim().length > 0,
    databas_finns: Boolean((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)),
    modell: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
  });
}
