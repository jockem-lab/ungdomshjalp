// Poäng till veckans topplista. Poängen bygger på insats, inte på andel rätt,
// så att en nioåring har lika stor chans som en femtonåring.
//  - 1 poäng per aktiv minut (högst 45 minuter per dag räknas)
//  - 5 poäng per avklarat pass (högst 6 pass per dag räknas)
//  - 10 poäng för varje dag man har tränat
// Veckan går måndag–söndag i svensk tid.

export const REGLER = { perMinut: 1, maxMinuterPerDag: 45, perPass: 5, maxPassPerDag: 6, perDag: 10 };

export function svenskDag(iso) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" }); // "2026-11-11"
}

// Måndagen i veckan som datumet ligger i, som "ÅÅÅÅ-MM-DD".
export function veckaStart(dag) {
  const d = new Date(dag + "T12:00:00Z");
  const vd = (d.getUTCDay() + 6) % 7; // måndag = 0
  d.setUTCDate(d.getUTCDate() - vd);
  return d.toISOString().slice(0, 10);
}

export function veckoNummer(dag) {
  const d = new Date(dag + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const forsta = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - forsta) / 86400000 - 3 + ((forsta.getUTCDay() + 6) % 7)) / 7);
}

// Räknar poäng för de pass som ligger i veckan som börjar på "start".
export function veckoPoang(poster, start) {
  const perDag = {};
  for (const p of poster) {
    const dag = svenskDag(p.tid);
    if (veckaStart(dag) !== start) continue;
    const d = (perDag[dag] = perDag[dag] || { sek: 0, pass: 0 });
    d.sek += p.sekunder || 0;
    if (p.klar) d.pass += 1;
  }
  let minuter = 0, pass = 0, dagar = 0, poang = 0;
  for (const d of Object.values(perDag)) {
    const min = Math.min(REGLER.maxMinuterPerDag, Math.floor(d.sek / 60));
    const ps = Math.min(REGLER.maxPassPerDag, d.pass);
    minuter += Math.floor(d.sek / 60);
    pass += d.pass;
    dagar += 1;
    poang += min * REGLER.perMinut + ps * REGLER.perPass + REGLER.perDag;
  }
  return { poang, minuter, pass, dagar };
}

// Veckans hemliga sticker. Den syns inte förrän veckan är slut, då får vinnaren (eller alla som delar
// förstaplatsen) den på sin profil. [tecken, namn, färg]
export const STICKERS = [
  ["🐉", "Guldraken", "#FDE68A"], ["🦄", "Regnbågsenhörningen", "#F5D0FE"], ["👑", "Kronan", "#FEF08A"],
  ["🚀", "Raketen", "#BFDBFE"], ["🌋", "Vulkanen", "#FECACA"], ["🐲", "Draken", "#BBF7D0"],
  ["🪐", "Planeten", "#DDD6FE"], ["🏆", "Pokalen", "#FDE68A"], ["🦁", "Lejonkungen", "#FED7AA"],
  ["🌈", "Regnbågen", "#E0F2FE"], ["🐙", "Superbläckfisken", "#FBCFE8"], ["⚡", "Blixten", "#FEF9C3"],
  ["🦖", "Dinosaurien", "#D9F99D"], ["💎", "Diamanten", "#CFFAFE"], ["🎸", "Gitarren", "#FCE7F3"],
  ["🐳", "Valen", "#BAE6FD"], ["🔥", "Elden", "#FED7AA"], ["🌟", "Stjärnan", "#FEF3C7"],
  ["🦊", "Räven", "#FFEDD5"], ["🎯", "Fullträffen", "#FEE2E2"], ["🦉", "Ugglan", "#E7E5E4"],
  ["🍀", "Fyrklövern", "#DCFCE7"], ["🐼", "Pandan", "#F3F4F6"], ["🧩", "Pusselbiten", "#E0E7FF"],
  ["🎨", "Paletten", "#FAE8FF"], ["🏰", "Slottet", "#E5E7EB"],
];

// Extra stickers som bara kan ges av en förälder i föräldravyn (de turas inte om som veckostickers).
// Egna figurer med emoji och färger, inga klubbmärken eller loggor eftersom repot är publikt.
export const EXTRA_STICKERS = [
  { id: "lfc-boll", tema: "Liverpool", tecken: "⚽", namn: "Matchbollen på Anfield", farg: "#FCA5A5" },
  { id: "lfc-arena", tema: "Liverpool", tecken: "🏟️", namn: "Anfield-kvällen", farg: "#FECACA" },
  { id: "lfc-halsduk", tema: "Liverpool", tecken: "🧣", namn: "Kopens halsduk", farg: "#F87171" },
  { id: "lfc-sang", tema: "Liverpool", tecken: "🎶", namn: "Du går aldrig ensam", farg: "#FECDD3" },
  { id: "lfc-pokal", tema: "Liverpool", tecken: "🏆", namn: "Den röda pokalen", farg: "#FDE68A" },
  { id: "lfc-hjarta", tema: "Liverpool", tecken: "❤️", namn: "Lagkamraten", farg: "#FEE2E2" },
];

// Alla stickers en förälder kan ge: veckostickers heter "v<nr>", extra stickers har eget id.
export function gavoSticker(nyckel) {
  const m = /^v(\d+)$/.exec(String(nyckel || ""));
  if (m) {
    const s = STICKERS[Number(m[1])];
    return s ? { tecken: s[0], namn: s[1], farg: s[2] } : null;
  }
  const e = EXTRA_STICKERS.find((x) => x.id === nyckel);
  return e ? { tecken: e.tecken, namn: e.namn, farg: e.farg } : null;
}

export function stickerForVecka(start) {
  const dagar = Math.round(new Date(start + "T12:00:00Z").getTime() / 86400000);
  const n = Math.floor(dagar / 7);
  return STICKERS[((n * 7) % STICKERS.length + STICKERS.length) % STICKERS.length];
}

function flyttaVeckor(start, antal) {
  const d = new Date(start + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7 * antal);
  return d.toISOString().slice(0, 10);
}

function rader(barnLista, loggar, start) {
  return barnLista
    .map((b) => ({ id: b.id, namn: b.namn, farg: b.farg, ...veckoPoang(loggar[b.id] || [], start) }))
    .sort((a, b) => b.poang - a.poang);
}

// Vinnare = alla som delar högsta poängen (minst 1 poäng).
export function veckansVinnare(barnLista, loggar, start) {
  const lista = rader(barnLista, loggar, start);
  const topp = lista[0]?.poang || 0;
  return topp > 0 ? lista.filter((r) => r.poang === topp).map((r) => r.id) : [];
}

// Avslutade veckor som har någon träning, nyast först (högst 52 veckor bakåt).
export function avslutadeVeckor(loggar, nu = new Date()) {
  const denna = veckaStart(svenskDag(nu.toISOString()));
  const set = new Set();
  for (const poster of Object.values(loggar)) {
    for (const p of poster) {
      const v = veckaStart(svenskDag(p.tid));
      if (v < denna && v >= flyttaVeckor(denna, -52)) set.add(v);
    }
  }
  return [...set].sort().reverse();
}

// Topplistan för denna vecka. vinnarePerVecka: { "2026-11-02": ["elina"], ... } för avslutade veckor.
export function byggTopplista(barnLista, loggar, vinnarePerVecka, nu = new Date()) {
  const idag = svenskDag(nu.toISOString());
  const denna = veckaStart(idag);
  const forra = flyttaVeckor(denna, -1);
  const slut = flyttaVeckor(denna, 1);
  const stickers = {};
  for (const b of barnLista) stickers[b.id] = [];
  for (const [start, ids] of Object.entries(vinnarePerVecka).sort().reverse()) {
    const [tecken, namn, farg] = stickerForVecka(start);
    for (const id of ids || []) stickers[id]?.push({ vecka: veckoNummer(start), start, tecken, namn, farg });
  }
  const fs = stickerForVecka(forra);
  return {
    vecka: veckoNummer(idag),
    dagarKvar: Math.round((new Date(slut + "T12:00:00Z") - new Date(idag + "T12:00:00Z")) / 86400000) - 1,
    lista: rader(barnLista, loggar, denna),
    forra: { vecka: veckoNummer(forra), vinnare: vinnarePerVecka[forra] || [], sticker: { tecken: fs[0], namn: fs[1], farg: fs[2] } },
    stickers,
  };
}
