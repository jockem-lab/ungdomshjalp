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
// info: { antal: frågor i passet, sprak: true om passet var i svenska eller ett språk } – används av Verners utmaningar.
export function belona(belo, typ, andel, info = {}) {
  const ny = { ...belo, dagar: [...new Set([...(belo.dagar || []), idag()])].slice(-400), forhor: (belo.forhor || 0) + 1 };
  if (typ === "dagar") {
    const fore = dagarIRad(belo.dagar || []);
    const efter = dagarIRad(ny.dagar);
    const nyttMarke = MARKEN.find((m) => fore < m && efter >= m);
    return { belo: ny, vinst: { typ, dagar: efter, nyttMarke } };
  }
  if (typ === "kpop") return belonaKpop(belo, ny, andel);
  if (typ === "fotboll") ny.utm = raknaUtm(belo.utm, andel, info);
  const lista = typ === "djur" ? DJUR : typ === "fotboll" ? SPELARE : KLISTER;
  const antal = andel >= 0.8 ? 2 : 1;
  const fore = belo.samling || 0;
  ny.samling = fore + antal;
  const nya = [];
  for (let i = fore; i < fore + antal; i++) nya.push(lista[i % lista.length]);
  const vinst = { typ, nya, totalt: ny.samling };
  if (typ === "fotboll") {
    const foreKlara = new Set(allaUtmaningar(utmaningsLage(belo)).filter((u) => u.klar).map((u) => u.id));
    vinst.special = allaUtmaningar(utmaningsLage(ny)).filter((u) => u.klar && !foreKlara.has(u.id));
  }
  return { belo: ny, vinst };
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
  // Påfyllning november 2026: 30 nya kort (nyare spelare och fler legendarer). Nya kort läggs
  // alltid sist så att de kort barnet redan har låst upp stannar på samma plats.
  ["Alexander Isak", "Anfallare", 9, "2020-talet"],
  ["Hugo Ekitiké", "Anfallare", 22, "2020-talet"],
  ["Jeremie Frimpong", "Ytterback", 30, "2020-talet"],
  ["Milos Kerkez", "Ytterback", 6, "2020-talet"],
  ["Giorgi Mamardashvili", "Målvakt", 25, "2020-talet"],
  ["Curtis Jones", "Mittfältare", 17, "2020-talet"],
  ["Conor Bradley", "Ytterback", 12, "2020-talet"],
  ["Joe Gomez", "Mittback", 2, "2010–2020-talet"],
  ["Wataru Endo", "Mittfältare", 3, "2020-talet"],
  ["Federico Chiesa", "Anfallare", 14, "2020-talet"],
  ["Luis Díaz", "Anfallare", 7, "2020-talet"],
  ["Darwin Núñez", "Anfallare", 9, "2020-talet"],
  ["Fabinho", "Mittfältare", 3, "2010–2020-talet"],
  ["Philippe Coutinho", "Mittfältare", 10, "2010-talet"],
  ["James Milner", "Mittfältare", 7, "2010–2020-talet"],
  ["Georginio Wijnaldum", "Mittfältare", 5, "2010–2020-talet"],
  ["Divock Origi", "Anfallare", 27, "2010–2020-talet"],
  ["Dirk Kuyt", "Anfallare", 18, "2000–2010-talet"],
  ["Pepe Reina", "Målvakt", 25, "2000–2010-talet"],
  ["Jerzy Dudek", "Målvakt", 1, "2000-talet"],
  ["John Arne Riise", "Ytterback", 6, "2000-talet"],
  ["Dietmar Hamann", "Mittfältare", 16, "1990–2000-talet"],
  ["Daniel Agger", "Mittback", 5, "2000–2010-talet"],
  ["Bruce Grobbelaar", "Målvakt", 1, "1980-talet"],
  ["Phil Neal", "Ytterback", 2, "1970–1980-talet"],
  ["Emlyn Hughes", "Mittback", 6, "1960–1970-talet"],
  ["Roger Hunt", "Anfallare", 8, "1960-talet"],
  ["Billy Liddell", "Ytter", 11, "1940–1950-talet"],
  ["Bob Paisley", "Legendarisk tränare", 0, "1974–1983"],
  ["Jürgen Klopp", "Legendarisk tränare", 0, "2015–2024"],
];

// Wikipedia-titlar för spelarna, där de skiljer sig från namnet.
export const WIKI_TITEL = {
  "John Barnes": "John Barnes (footballer)",
  "Curtis Jones": "Curtis Jones (footballer, born 2001)",
  "Fabinho": "Fabinho (footballer, born 1993)",
  "Luis Díaz": "Luis Díaz (footballer, born 1997)",
};
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

// Förälderns justering från föräldravyn läggs ovanpå det barnet har tjänat ihop.
export function medJustering(belo, justering = 0) {
  if (!justering) return belo;
  return { ...belo, samling: Math.max(0, (belo.samling || 0) + justering) };
}

// Vad ett barn har låst upp, för föräldravyn: [{ tecken?, namn, farg?, holo? }], hur många som finns och varv.
export function upplasta(typ, antal, belo = {}) {
  const n = Math.max(0, antal || 0);
  if (typ === "kpop") {
    return {
      max: KPOP.length,
      enhet: "K-pop-stickers",
      saker: KPOP.slice(0, Math.min(n, KPOP.length)).map((s) => ({ namn: s.namn, grupp: kpopGrupp(s.grupp).namn, farg: kpopGrupp(s.grupp).fran, text: kpopGrupp(s.grupp).text })),
      holo: Math.min(Math.max(0, n - KPOP.length), KPOP.length),
      bonus: klaraGrupper(n).map((g) => kpopGrupp(g).namn),
    };
  }
  if (typ === "fotboll") {
    return {
      max: SPELARE.length,
      enhet: "spelarkort",
      saker: SPELARE.slice(0, Math.min(n, SPELARE.length)).map(([namn, , nr]) => ({ namn, nr })),
      utmaningar: allaUtmaningar(utmaningsLage({ ...belo, samling: n })),
    };
  }
  const lista = typ === "djur" ? DJUR : KLISTER;
  return {
    max: lista.length,
    enhet: typ === "djur" ? "djur" : "klistermärken",
    saker: lista.slice(0, Math.min(n, lista.length)).map(([tecken, x]) => (typ === "djur" ? { tecken, namn: x } : { tecken, farg: x })),
    varv: Math.floor(n / lista.length),
  };
}

// ---------- Verners guld- och halostickers ----------
// Specialversioner av de mest kända spelarna. De delas inte ut i tur och ordning som vanliga kort,
// utan låses upp av utmaningar kopplade till träningen. Allt räknas från dagen utmaningarna
// startade på Verners enhet (belo.utm.fran), så gammal träning ger inga gratis guldkort.
//
// belo.utm = { fran: "ÅÅÅÅ-MM-DD", fullpott, sprak, bra }
//  fullpott – pass helt utan fel (minst 5 frågor)
//  sprak    – avklarade pass i svenska eller ett språk (det Verner behöver stärka)
//  bra      – pass med minst 80 % rätt
// Räknarna växer bara, så flera enheter kan slås ihop genom att ta det största.

export const GULD = [
  { id: "guld-salah", spelare: "Mohamed Salah", rubrik: "Kedjan", text: "Träna 3 dagar i rad", matt: "kedja", mal: 3, enhet: "dagar i rad" },
  { id: "guld-vandijk", spelare: "Virgil van Dijk", rubrik: "Muren", text: "Gör ett pass helt utan fel (minst 5 frågor)", matt: "fullpott", mal: 1, enhet: "pass utan fel" },
  { id: "guld-alisson", spelare: "Alisson Becker", rubrik: "Ordräddaren", text: "Gör 5 pass i svenska eller språk", matt: "sprak", mal: 5, enhet: "språkpass" },
  { id: "guld-szoboszlai", spelare: "Dominik Szoboszlai", rubrik: "Precision", text: "Gör 10 pass med minst 80 % rätt", matt: "bra", mal: 10, enhet: "pass med 80 %" },
  { id: "guld-wirtz", spelare: "Florian Wirtz", rubrik: "Matchvecka", text: "Träna 3 olika dagar under samma vecka", matt: "vecka", mal: 3, enhet: "dagar samma vecka" },
];

export const HALO = [
  { id: "halo-gerrard", spelare: "Steven Gerrard", rubrik: "Kaptenen", text: "Träna 7 dagar i rad", matt: "kedja", mal: 7, enhet: "dagar i rad" },
  { id: "halo-dalglish", spelare: "Kenny Dalglish", rubrik: "Kungen", text: "Gör 3 pass helt utan fel (minst 5 frågor)", matt: "fullpott", mal: 3, enhet: "pass utan fel" },
  { id: "halo-rush", spelare: "Ian Rush", rubrik: "Målmaskinen", text: "Gör 15 pass i svenska eller språk", matt: "sprak", mal: 15, enhet: "språkpass" },
  { id: "halo-barnes", spelare: "John Barnes", rubrik: "Guldsamlaren", text: "Lås upp alla 5 guldstickers", matt: "guld", mal: 5, enhet: "guldstickers" },
  { id: "halo-keegan", spelare: "Kevin Keegan", rubrik: "Hela truppen", text: `Samla alla ${SPELARE.length} vanliga spelarkort`, matt: "samling", mal: SPELARE.length, enhet: "spelarkort" },
];

export function nyUtm() {
  return { fran: idag(), fullpott: 0, sprak: 0, bra: 0 };
}

function raknaUtm(utm, andel, info) {
  const u = { ...nyUtm(), ...(utm || {}) };
  if (andel >= 1 && (info.antal || 0) >= 5) u.fullpott += 1;
  if (info.sprak) u.sprak += 1;
  if (andel >= 0.8) u.bra += 1;
  return u;
}

// Längsta kedjan av dagar i rad bland datumen.
export function langstaKedja(dagar) {
  const s = [...new Set(dagar)].sort();
  let basta = 0, nu = 0, forra = null;
  for (const d of s) {
    const t = new Date(d + "T12:00:00");
    nu = forra && Math.round((t - forra) / 86400000) === 1 ? nu + 1 : 1;
    basta = Math.max(basta, nu);
    forra = t;
  }
  return basta;
}

// Flest träningsdagar under en och samma vecka (måndag–söndag).
function flestPerVecka(dagar) {
  const per = {};
  for (const d of new Set(dagar)) {
    const t = new Date(d + "T12:00:00Z");
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
    const v = t.toISOString().slice(0, 10);
    per[v] = (per[v] || 0) + 1;
  }
  return Math.max(0, ...Object.values(per));
}

// Hur långt barnet har kommit på varje utmaning: { guld: [...], halo: [...] } där varje
// utmaning har fått { nu, klar } tillagt.
export function utmaningsLage(belo = {}) {
  const u = belo.utm || {};
  const fran = u.fran || idag();
  const dagar = (belo.dagar || []).filter((d) => d >= fran);
  const varden = {
    kedja: langstaKedja(dagar),
    vecka: flestPerVecka(dagar),
    fullpott: u.fullpott || 0,
    sprak: u.sprak || 0,
    bra: u.bra || 0,
    samling: Math.min(belo.samling || 0, SPELARE.length),
  };
  const satt = (x) => ({ ...x, nu: Math.min(x.mal, varden[x.matt] || 0), klar: (varden[x.matt] || 0) >= x.mal });
  const guld = GULD.map((x) => ({ ...satt(x), sort: "guld" }));
  varden.guld = guld.filter((x) => x.klar).length;
  const halo = HALO.map((x) => ({ ...satt(x), sort: "halo" }));
  return { guld, halo, fran };
}

export function allaUtmaningar(lage) {
  return [...lage.guld, ...lage.halo];
}

export function spelareMedNamn(namn) {
  return SPELARE.find((s) => s[0] === namn);
}
