// Gemensamt för /api/topplista och /api/admin: läser loggarna, delar ut veckans stickers och bygger listan.
// Vinnarna för en avslutad vecka sparas i databasen ("vinnare:<måndag>"), så att stickern finns kvar
// även när gamla loggar har rensats bort.
import { BARN } from "./barn";
import { redis } from "./databas";
import { avslutadeVeckor, veckansVinnare, byggTopplista } from "./poang";

export function tolka(lista) {
  return (lista || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

export async function lasLoggar(antal = 1999) {
  const svar = await redis(BARN.map((b) => ["LRANGE", `logg:${b.id}`, 0, antal]));
  const loggar = {};
  BARN.forEach((b, i) => { loggar[b.id] = tolka(svar[i]); });
  return loggar;
}

export async function topplistaFranDatabas(loggar) {
  const [sparade] = await redis([["KEYS", "vinnare:*"]]);
  const nycklar = sparade || [];
  const vinnare = {};
  if (nycklar.length) {
    const varden = (await redis([["MGET", ...nycklar]]))[0] || [];
    nycklar.forEach((k, i) => { try { vinnare[k.slice(8)] = JSON.parse(varden[i]); } catch {} });
  }
  const nya = [];
  for (const start of avslutadeVeckor(loggar)) {
    if (vinnare[start]) continue;
    vinnare[start] = veckansVinnare(BARN, loggar, start);
    nya.push(["SET", `vinnare:${start}`, JSON.stringify(vinnare[start])]);
  }
  if (nya.length) await redis(nya);
  return byggTopplista(BARN, loggar, vinnare);
}

export function topplistaUtanDatabas(loggar) {
  const vinnare = {};
  for (const start of avslutadeVeckor(loggar)) vinnare[start] = veckansVinnare(BARN, loggar, start);
  return byggTopplista(BARN, loggar, vinnare);
}
