// Svårighetsnivåer kopplade till betygsstegen i Skolverkets betygsskala (E, C, A).
// Betyg sätts från åk 6, så yngre barn ser Lätt/Lagom/Svår men samma nivåer används.

export const NIVAER = [
  { id: "blandat", namn: "Som riktiga provet", ung: "Blandat", info: "Från lätta till svåra frågor, ungefär som ett riktigt prov." },
  { id: "E", namn: "E-nivå", ung: "Lätt", info: "Grundläggande kunskaper och enkla resonemang." },
  { id: "C", namn: "C-nivå", ung: "Lagom", info: "Utvecklade resonemang och uppgifter i flera steg." },
  { id: "A", namn: "A-nivå", ung: "Svår", info: "Välutvecklade, nyanserade resonemang och svår problemlösning." },
];

export function nivaNamn(id, arskurs) {
  const n = NIVAER.find((x) => x.id === id);
  if (!n) return "";
  return arskurs < 6 ? n.ung : n.namn;
}

export function tvattaNiva(id) {
  return NIVAER.some((n) => n.id === id) ? id : "blandat";
}

// Text till Claude som beskriver nivån.
export function nivaInstruktion(id, arskurs) {
  const steg = `Betygsstegen (Skolverket, Lgr22): E = eleven visar grundläggande kunskaper, för enkla och till viss del underbyggda resonemang och löser enkla problem. C = utvecklade kunskaper, utvecklade och relativt väl underbyggda resonemang, problem i flera steg. A = mycket goda kunskaper, välutvecklade och väl underbyggda resonemang, kan generalisera, jämföra och lösa komplexa problem med effektiva metoder.`;
  const ar = arskurs < 6 ? ` Eleven går i åk ${arskurs}, där betyg inte sätts än: tolka E/C/A som lätt/lagom/svårt för just åk ${arskurs}, i förhållande till kunskapskraven som ska vara uppnådda i slutet av åk ${arskurs <= 3 ? 3 : 6}.` : "";
  const val = {
    blandat: "Fördela frågorna ungefär som ett riktigt prov: cirka 40 % E-nivå, 35 % C-nivå och 25 % A-nivå, i ordning från lätt till svår.",
    E: "ALLA frågor ska ligga på E-nivå, men fortfarande på rätt nivå för årskursen (inte förenklade till en lägre årskurs).",
    C: "ALLA frågor ska ligga på C-nivå: kräv flera steg, förklaringar och samband.",
    A: "ALLA frågor ska ligga på A-nivå: utmanande, kräver analys, jämförelser, generaliseringar och problemlösning i flera steg. Det ska kännas svårt även för en stark elev.",
  }[id];
  return `${steg}${ar}\nNivå för detta förhör: ${val}\nNivån ska motsvara årskursen fullt ut; gör inte frågorna enklare än vad som förväntas i årskursen. Ange för varje fråga i "niva" vilket betygssteg (E, C eller A) den motsvarar.`;
}
