// Delad lagring för föräldravyn: Upstash Redis via Vercel (Storage → Upstash for Redis).
// Vercel lägger själv in adressen och nyckeln som miljövariabler när databasen kopplas till projektet.
// Vi pratar med databasen över vanlig HTTPS, så inga extra paket behövs.

function installningar() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function databasFinns() {
  return Boolean(installningar());
}

// Kör flera Redis-kommandon i ett anrop. Ger tillbaka resultaten i samma ordning.
export async function redis(kommandon) {
  const inst = installningar();
  if (!inst) throw new Error("Databasen är inte kopplad.");
  const r = await fetch(`${inst.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${inst.token}`, "content-type": "application/json" },
    body: JSON.stringify(kommandon),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Databasen svarade ${r.status}`);
  const svar = await r.json();
  return svar.map((s) => {
    if (s.error) throw new Error(s.error);
    return s.result;
  });
}

export const MAX_POSTER = 2000; // per barn, äldst försvinner först
