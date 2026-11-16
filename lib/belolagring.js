// Barnens belöningar (djur, klistermärken, spelarkort, K-pop-stickers) sparas centralt i databasen
// så att föräldravyn kan se dem och fylla på eller ändra.
//
// Två delar hålls isär så att mobilen och föräldern aldrig skriver över varandra:
//  "belo:<barnId>"      – det barnet har tjänat ihop (samling, förhör, träningsdagar). Mobilen skickar
//                         sitt läge och databasen behåller det största, så flera enheter går ihop.
//  "justering:<barnId>" – förälderns ändring, ett tal som läggs till samlingen (kan vara negativt).
// Barnet ser alltså samling + justering. Föräldern kan dessutom ge extra hemliga stickers
// ("gavor:<barnId>") och ta bort vunna veckostickers (ändrar "vinnare:<måndag>").
import { BARN } from "./barn";
import { redis } from "./databas";
import { tomBelo } from "./belo";
import { gavoSticker } from "./poang";

export const MAX_SAMLING = 500;

const heltal = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const ARDAG = /^\d{4}-\d{2}-\d{2}$/;

// Gör om det mobilen skickar till ett säkert belo-objekt.
export function stadaBelo(b) {
  const x = b && typeof b === "object" ? b : {};
  return {
    samling: heltal(x.samling, 0, 100000),
    forhor: heltal(x.forhor, 0, 100000),
    dagar: [...new Set((Array.isArray(x.dagar) ? x.dagar : []).filter((d) => typeof d === "string" && ARDAG.test(d)))].sort().slice(-400),
  };
}

// Slår ihop två lägen: störst samling och antal förhör, alla träningsdagar.
export function slaIhop(a, b) {
  const x = stadaBelo(a);
  const y = stadaBelo(b);
  return {
    samling: Math.max(x.samling, y.samling),
    forhor: Math.max(x.forhor, y.forhor),
    dagar: [...new Set([...x.dagar, ...y.dagar])].sort().slice(-400),
  };
}

function las(s, standard) {
  if (s === null || s === undefined) return standard;
  try { return JSON.parse(s); } catch { return standard; }
}

// Mobilen synkar: skickar sitt läge (eller inget) och får tillbaka det sammanslagna plus förälderns justering.
export async function synkaBelo(barnId, belo) {
  const [sparat, just] = await redis([["GET", `belo:${barnId}`], ["GET", `justering:${barnId}`]]);
  const fore = stadaBelo(las(sparat, tomBelo()));
  const ny = belo ? slaIhop(fore, belo) : fore;
  if (JSON.stringify(ny) !== JSON.stringify(fore)) await redis([["SET", `belo:${barnId}`, JSON.stringify(ny)]]);
  return { belo: ny, justering: heltal(just, -100000, 100000) };
}

// Allt föräldravyn behöver: varje barns belöningar och justering.
export async function lasAllaBelo() {
  const svar = await redis(BARN.flatMap((b) => [["GET", `belo:${b.id}`], ["GET", `justering:${b.id}`]]));
  const ut = {};
  BARN.forEach((b, i) => {
    ut[b.id] = { ...stadaBelo(las(svar[2 * i], tomBelo())), justering: heltal(svar[2 * i + 1], -100000, 100000) };
  });
  return ut;
}

export async function lasGavor() {
  const svar = await redis(BARN.map((b) => ["GET", `gavor:${b.id}`]));
  const ut = {};
  BARN.forEach((b, i) => { ut[b.id] = (las(svar[i], []) || []).filter((g) => g && gavoSticker(g.sticker)); });
  return ut;
}

// Förälderns ändringar. Ger ett felmeddelande på svenska om något inte stämmer.
export async function andraBelo(atgard) {
  const barnId = String(atgard?.barnId || "");
  if (!BARN.some((b) => b.id === barnId)) return "Okänt barn.";

  if (atgard.typ === "antal") {
    // Föräldern anger hur många barnet ska ha totalt; vi sparar skillnaden mot det barnet tjänat.
    const [sparat] = await redis([["GET", `belo:${barnId}`]]);
    const tjanat = stadaBelo(las(sparat, tomBelo())).samling;
    const mal = heltal(atgard.antal, 0, MAX_SAMLING);
    await redis([["SET", `justering:${barnId}`, String(mal - tjanat)]]);
    return null;
  }

  if (atgard.typ === "ge-sticker") {
    const sticker = String(atgard.sticker || "");
    if (!gavoSticker(sticker)) return "Okänd sticker.";
    const [sparat] = await redis([["GET", `gavor:${barnId}`]]);
    const lista = las(sparat, []) || [];
    lista.push({ id: `gava-${Date.now().toString(36)}`, sticker, tid: new Date().toISOString() });
    await redis([["SET", `gavor:${barnId}`, JSON.stringify(lista.slice(-100))]]);
    return null;
  }

  if (atgard.typ === "ta-bort-sticker") {
    const id = String(atgard.id || "");
    if (id.startsWith("gava-")) {
      const [sparat] = await redis([["GET", `gavor:${barnId}`]]);
      const lista = (las(sparat, []) || []).filter((g) => g.id !== id);
      await redis([["SET", `gavor:${barnId}`, JSON.stringify(lista)]]);
      return null;
    }
    if (!ARDAG.test(id)) return "Okänd sticker.";
    // En vunnen veckosticker: ta bort barnet ur veckans vinnare. En tom lista finns kvar så att veckan inte räknas om.
    const [sparat] = await redis([["GET", `vinnare:${id}`]]);
    const vinnare = las(sparat, null);
    if (!Array.isArray(vinnare)) return "Hittade inte veckan.";
    await redis([["SET", `vinnare:${id}`, JSON.stringify(vinnare.filter((v) => v !== barnId))]]);
    return null;
  }

  return "Okänd ändring.";
}
