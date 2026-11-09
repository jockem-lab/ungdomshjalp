// Kollar familjekoden när någon loggar in på en ny enhet.
export async function POST(req) {
  const { kod } = await req.json();
  const ok = Boolean(process.env.FAMILJEKOD) && kod === process.env.FAMILJEKOD;
  return Response.json({ ok }, { status: ok ? 200 : 401 });
}
