// Belöningar. Varje barn har en egen sorts belöning (se "belo" i lib/barn.js):
//  "djur"    – samlar djur, ett nytt för varje avklarat förhör (två vid minst 80 % rätt)
//  "klister" – samlar färgglada klistermärken på samma sätt
//  "dagar"   – dagar i rad och märken vid 3, 7, 14, 30 och 60 dagar

export const DJUR = [
  ["🐶", "Hund"], ["🐱", "Katt"], ["🐰", "Kanin"], ["🦊", "Räv"], ["🐻", "Björn"],
  ["🐼", "Panda"], ["🐨", "Koala"], ["🦁", "Lejon"], ["🐯", "Tiger"], ["🐸", "Groda"],
  ["🐧", "Pingvin"], ["🦉", "Uggla"], ["🐢", "Sköldpadda"], ["🐬", "Delfin"], ["🦔", "Igelkott"],
  ["🐘", "Elefant"], ["🦒", "Giraff"], ["🐿️", "Ekorre"], ["🦋", "Fjäril"], ["🐙", "Bläckfisk"],
  ["🦜", "Papegoja"], ["🐳", "Val"], ["🦓", "Zebra"], ["🦄", "Enhörning"],
];

export const KLISTER = [
  ["🌈", "#FDE68A"], ["⭐", "#BFDBFE"], ["🌸", "#FBCFE8"], ["🍓", "#FECACA"], ["🦋", "#DDD6FE"],
  ["🎨", "#A7F3D0"], ["💎", "#BAE6FD"], ["🌻", "#FEF08A"], ["🍭", "#F5D0FE"], ["🎀", "#FBCFE8"],
  ["🌙", "#C7D2FE"], ["🍀", "#BBF7D0"], ["🧁", "#FED7AA"], ["🪐", "#E9D5FF"], ["🌺", "#FECDD3"],
  ["🎈", "#FECACA"], ["🐚", "#FDE2E4"], ["🍉", "#D9F99D"], ["✨", "#FEF3C7"], ["🦄", "#F5D0FE"],
];

export const MARKEN = [3, 7, 14, 30, 60];

export function tomBelo() {
  return { samling: 0, dagar: [], forhor: 0 };
}

function idag() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Antal dagar i rad som slutar idag eller igår.
export function dagarIRad(dagar) {
  const set = new Set(dagar);
  const d = new Date();
  const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(fmt(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// Uppdaterar belöningarna efter ett avklarat förhör och berättar vad barnet fick.
export function belona(belo, typ, andel) {
  const ny = { ...belo, dagar: [...new Set([...(belo.dagar || []), idag()])].slice(-400), forhor: (belo.forhor || 0) + 1 };
  if (typ === "dagar") {
    const fore = dagarIRad(belo.dagar || []);
    const efter = dagarIRad(ny.dagar);
    const nyttMarke = MARKEN.find((m) => fore < m && efter >= m);
    return { belo: ny, vinst: { typ, dagar: efter, nyttMarke } };
  }
  const lista = typ === "djur" ? DJUR : KLISTER;
  const antal = andel >= 0.8 ? 2 : 1;
  const fore = belo.samling || 0;
  ny.samling = fore + antal;
  const nya = [];
  for (let i = fore; i < fore + antal; i++) nya.push(lista[i % lista.length]);
  return { belo: ny, vinst: { typ, nya, totalt: ny.samling } };
}
