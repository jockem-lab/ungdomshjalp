// Koreanska ord och pepp för barn som tränar koreanska (sätt koreanska: true i lib/barn.js).
// [hangul, uttal, svenska]

export const UTTRYCK = [
  ["안녕", "annyeong", "Hej! (till kompisar)"],
  ["안녕하세요", "annyeonghaseyo", "Hej! (artigt, till vuxna)"],
  ["고마워", "gomawo", "Tack! (till kompisar)"],
  ["감사합니다", "gamsahamnida", "Tack så mycket! (artigt)"],
  ["화이팅", "hwaiting", "Heja! Kämpa på!"],
  ["잘했어", "jalhaesseo", "Bra gjort!"],
  ["대박", "daebak", "Wow, grymt!"],
  ["괜찮아", "gwaenchana", "Det är okej. Det gör inget."],
  ["최고", "choego", "Bäst!"],
  ["좋아", "joa", "Bra! Jag gillar det."],
  ["귀여워", "gwiyeowo", "Så söt!"],
  ["친구", "chingu", "Kompis"],
  ["사랑해", "saranghae", "Jag älskar dig"],
  ["동물", "dongmul", "Djur"],
  ["카피바라", "kapibara", "Capybara"],
  ["숙제", "sukje", "Läxa"],
  ["학교", "hakgyo", "Skola"],
  ["잘 자", "jal ja", "Sov gott!"],
];

export const PEPP_RATT = [
  ["잘했어!", "jalhaesseo", "Bra gjort!"],
  ["대박!", "daebak", "Grymt!"],
  ["최고!", "choego", "Bäst!"],
  ["맞아!", "maja", "Precis!"],
];

export const PEPP_FEL = [
  ["괜찮아!", "gwaenchana", "Det gör inget!"],
  ["화이팅!", "hwaiting", "Kämpa på!"],
];

// Samma uttryck hela dagen, nytt nästa dag.
export function dagensUttryck(d = new Date()) {
  const dag = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  return UTTRYCK[dag % UTTRYCK.length];
}

export function slumpa(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}
