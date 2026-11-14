// Belöningar. Varje barn har en egen sorts belöning (se "belo" i lib/barn.js):
//  "djur"    – samlar djur, ett nytt för varje avklarat förhör (två vid minst 80 % rätt)
//  "klister" – samlar färgglada klistermärken på samma sätt
//  "fotboll" – samlar Liverpool-spelare som kort
//  "kpop"    – samlar egenritade K-pop-stickers, en per medlem (se KPOP_GRUPPER nedan)
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
  if (typ === "kpop") return belonaKpop(belo, ny, andel);
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

// Emmys samling: K-pop-stickers. Stickers ritas i appen själv (färger, namn och
// figurer) – inga foton eller officiella loggor, eftersom repot är publikt.
// Lägg till eller ta bort medlemmar här så följer albumet med.
export const KPOP_GRUPPER = [
  { id: "illit", namn: "ILLIT", fran: "#F9A8D4", till: "#C4B5FD", text: "#5B2166", symbol: "gnistra",
    medlemmar: ["Yunah", "Minju", "Moka", "Wonhee", "Iroha"] },
  { id: "aespa", namn: "aespa", fran: "#7DD3FC", till: "#A78BFA", text: "#1E1B4B", symbol: "planet",
    medlemmar: ["Karina", "Giselle", "Winter", "Ningning"] },
  { id: "babymonster", namn: "BABYMONSTER", fran: "#1F1F2E", till: "#EC4899", text: "#FFFFFF", symbol: "horn",
    medlemmar: ["Ruka", "Pharita", "Asa", "Ahyeon", "Rami", "Rora", "Chiquita"] },
  { id: "katseye", namn: "KATSEYE", fran: "#FB923C", till: "#FDE047", text: "#431407", symbol: "katt",
    medlemmar: ["Daniela", "Lara", "Manon", "Megan", "Sophia", "Yoonchae"] },
];

const DEKOR = ["hjarta", "stjarna", "gnistra", "mane", "blomma", "krona", "not"];

// Stickers delas ut en grupp i taget i tur och ordning (ILLIT, aespa, BABYMONSTER, KATSEYE, ILLIT …)
// så att Emmy får lite av varje. När en hel grupp är klar låses gruppens bonussticker upp.
export const KPOP = (() => {
  const ut = [];
  const max = Math.max(...KPOP_GRUPPER.map((g) => g.medlemmar.length));
  for (let r = 0; r < max; r++) {
    for (const g of KPOP_GRUPPER) {
      if (r < g.medlemmar.length) ut.push({ grupp: g.id, namn: g.medlemmar[r], dekor: DEKOR[ut.length % DEKOR.length] });
    }
  }
  return ut.map((s, i) => ({ ...s, nr: i + 1 }));
})();

export function kpopGrupp(id) {
  return KPOP_GRUPPER.find((g) => g.id === id);
}

// Vilka grupper som är kompletta när man har samlat "antal" stickers.
export function klaraGrupper(antal) {
  const har = new Set(KPOP.slice(0, Math.min(antal, KPOP.length)).map((s) => s.namn + s.grupp));
  return KPOP_GRUPPER.filter((g) => g.medlemmar.every((m) => har.has(m + g.id))).map((g) => g.id);
}

// Efter ett helt album börjar en andra runda med glittriga holo-versioner.
function belonaKpop(belo, ny, andel) {
  const antal = andel >= 0.8 ? 2 : 1;
  const fore = belo.samling || 0;
  ny.samling = fore + antal;
  const nya = [];
  for (let i = fore; i < fore + antal; i++) nya.push({ ...KPOP[i % KPOP.length], holo: i >= KPOP.length });
  const foreKlara = new Set(klaraGrupper(fore));
  const nyaGrupper = klaraGrupper(ny.samling).filter((g) => !foreKlara.has(g));
  return { belo: ny, vinst: { typ: "kpop", nya, nyaGrupper, totalt: ny.samling } };
}
