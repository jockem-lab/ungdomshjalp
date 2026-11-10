// Ämnen som barnen kan skapa själva. Varje ämne har en "typ" som styr hur förhören byggs.

export const TYPER = {
  sprak: { namn: "Språk", info: "Glosor, stavning och uppläsning" },
  lasamne: { namn: "Läsämne", info: "SO, NO, historia… sammanfattning och förståelse" },
  matte: { namn: "Matte", info: "Räkna liknande uppgifter steg för steg" },
  annat: { namn: "Annat", info: "Allt annat" },
};

export const SPRAK = [
  { kod: "sv-SE", namn: "Svenska" },
  { kod: "en-GB", namn: "Engelska" },
  { kod: "es-ES", namn: "Spanska" },
  { kod: "de-DE", namn: "Tyska" },
  { kod: "fr-FR", namn: "Franska" },
  { kod: "it-IT", namn: "Italienska" },
  { kod: "ko-KR", namn: "Koreanska" },
];

export const STANDARD_AMNEN = [
  { id: "svenska", namn: "Svenska", typ: "sprak", sprak: "sv-SE" },
  { id: "engelska", namn: "Engelska", typ: "sprak", sprak: "en-GB" },
  { id: "matte", namn: "Matte", typ: "matte", sprak: "" },
  { id: "so", namn: "SO", typ: "lasamne", sprak: "" },
  { id: "no", namn: "NO", typ: "lasamne", sprak: "" },
];

export function sprakNamn(kod) {
  return SPRAK.find((s) => s.kod === kod)?.namn || "";
}

// Tvättar ett ämne som kommer från webbläsaren innan det används på servern.
export function tvattaAmne(a) {
  const typ = TYPER[a?.typ] ? a.typ : "annat";
  const sprak = typ === "sprak" && SPRAK.some((s) => s.kod === a?.sprak) ? a.sprak : "";
  const namn = String(a?.namn || "Okänt ämne").slice(0, 40);
  return { namn, typ, sprak };
}
