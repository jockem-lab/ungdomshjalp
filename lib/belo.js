// Belöningar. Varje barn har en egen sorts belöning (se "belo" i lib/barn.js):
//  "djur"    – samlar djur, ett nytt för varje avklarat förhör (två vid minst 80 % rätt)
//  "klister" – samlar färgglada klistermärken på samma sätt
//  "fotboll" – samlar Liverpool-spelare som kort
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
  const lista = typ === "djur" ? DJUR : typ === "fotboll" ? SPELARE : KLISTER;
  const antal = andel >= 0.8 ? 2 : 1;
  const fore = belo.samling || 0;
  ny.samling = fore + antal;
  const nya = [];
  for (let i = fore; i < fore + antal; i++) nya.push(lista[i % lista.length]);
  return { belo: ny, vinst: { typ, nya, totalt: ny.samling } };
}

// Verners samling: fotbollsspelare från Liverpool genom tiderna.
// [namn, position, tröjnummer, epok]
export const SPELARE = [
  ["Mohamed Salah", "Anfallare", 11, "2010–2020-talet"],
  ["Virgil van Dijk", "Mittback", 4, "2010–2020-talet"],
  ["Steven Gerrard", "Mittfältare", 8, "1990–2010-talet"],
  ["Kenny Dalglish", "Anfallare", 7, "1970–1990-talet"],
  ["Alisson Becker", "Målvakt", 1, "2010–2020-talet"],
  ["Ian Rush", "Anfallare", 9, "1980–1990-talet"],
  ["Andy Robertson", "Ytterback", 26, "2010–2020-talet"],
  ["Jamie Carragher", "Mittback", 23, "1990–2010-talet"],
  ["Dominik Szoboszlai", "Mittfältare", 8, "2020-talet"],
  ["John Barnes", "Ytter", 10, "1980–1990-talet"],
  ["Trent Alexander-Arnold", "Ytterback", 66, "2010–2020-talet"],
  ["Fernando Torres", "Anfallare", 9, "2000–2010-talet"],
  ["Alexis Mac Allister", "Mittfältare", 10, "2020-talet"],
  ["Kevin Keegan", "Anfallare", 7, "1970-talet"],
  ["Roberto Firmino", "Anfallare", 9, "2010–2020-talet"],
  ["Robbie Fowler", "Anfallare", 9, "1990–2000-talet"],
  ["Ibrahima Konaté", "Mittback", 5, "2020-talet"],
  ["Sadio Mané", "Anfallare", 10, "2010–2020-talet"],
  ["Graeme Souness", "Mittfältare", 11, "1970–1980-talet"],
  ["Luis Suárez", "Anfallare", 7, "2010-talet"],
  ["Ryan Gravenberch", "Mittfältare", 38, "2020-talet"],
  ["Michael Owen", "Anfallare", 10, "1990–2000-talet"],
  ["Xabi Alonso", "Mittfältare", 14, "2000-talet"],
  ["Cody Gakpo", "Anfallare", 18, "2020-talet"],
  ["Alan Hansen", "Mittback", 6, "1970–1990-talet"],
  ["Sami Hyypiä", "Mittback", 4, "1990–2000-talet"],
  ["Jordan Henderson", "Mittfältare", 14, "2010–2020-talet"],
  ["Ray Clemence", "Målvakt", 1, "1960–1980-talet"],
  ["Florian Wirtz", "Mittfältare", 7, "2020-talet"],
  ["Bill Shankly", "Legendarisk tränare", 0, "1959–1974"],
];

// Wikipedia-titlar för spelarna, där de skiljer sig från namnet.
export const WIKI_TITEL = { "John Barnes": "John Barnes (footballer)" };
export const KLUBB_WIKI = "Liverpool F.C.";
