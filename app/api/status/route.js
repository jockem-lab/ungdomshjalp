// Felsökning: visar om inställningarna finns, utan att visa själva värdena.
export const dynamic = "force-dynamic";

export async function GET() {
  const kod = String(process.env.FAMILJEKOD || "");
  return Response.json({
    version: "3",
    familjekod_finns: kod.trim().length > 0,
    familjekod_antal_tecken: kod.trim().length,
    api_nyckel_finns: Boolean(process.env.ANTHROPIC_API_KEY),
    andra_namn_som_liknar: Object.keys(process.env).filter((k) => /famil|kod|anthropic/i.test(k)),
  });
}
