// Barnens profiler. Här ändrar ni namn, färger och hur hjälpläraren ska bete sig.
// "larstil" skickas med till Claude så att förhören anpassas efter barnet.

export const BARN = [
  {
    id: "elina",
    tema: "cheer",
    belo: "dagar",
    arskurs: 9,
    namn: "Elina",
    info: "Åk 9 · Fredsborgsskolan",
    alder: 15,
    farg: "#1E3A8A",
    ljus: "#E0E7FF",
    larstil:
      "Går i åk 9. Stark i naturämnen (NO), intresserad av samhällsämnen och vill läsa samhällsprogrammet på gymnasiet. Ge resonerande frågor, be henne förklara samband och använda ämnesbegrepp. Får gärna vara på högstadiets högsta nivå.",
  },
  {
    id: "julie",
    tema: "pop",
    belo: "dagar",
    arskurs: 8,
    namn: "Julie",
    info: "Åk 8 · Skärgårdsstadsskolan",
    alder: 14,
    farg: "#6D28D9",
    ljus: "#EDE9FE",
    larstil:
      "Går i åk 8. Stark i alla ämnen, både muntligt och skriftligt. Utmana henne med svårare frågor och be henne formulera svar med egna ord.",
  },
  {
    id: "verner",
    belo: "fotboll",
    tema: "lfc", // röd Liverpool-känsla på hans sida
    arskurs: 6,
    namn: "Verner",
    info: "Åk 6 · Skärgårdsstadsskolan",
    alder: 12,
    farg: "#C8102E",
    ljus: "#FDE2E4",
    larstil:
      "Går i åk 6. Svagare i skrift och lär sig bäst visuellt och genom upprepad träning. Behöver stärka skrivandet i svenska och språk. Använd korta, tydliga frågor med enkla ord. Blanda flerval med korta skrivsvar (ett eller några ord) så att han tränar att skriva. Var uppmuntrande.",
  },
  {
    id: "emmy",
    tema: "kpop",
    belo: "kpop", // samlar K-pop-stickers: ILLIT, aespa, BABYMONSTER och KATSEYE
    arskurs: 5,
    namn: "Emmy",
    info: "Åk 5 · Österskärsskolan",
    alder: 11,
    farg: "#C026D3",
    ljus: "#FAE8FF",
    larstil:
      "11 år, går i åk 5 på Österskärsskolan. Mycket stark i svenska och har lätt för matte. Gillar pyssel och färger. Ge gärna lite klurigare uppgifter och kreativa exempel.",
  },
  {
    id: "edith",
    belo: "djur",
    tema: "capy", // mjuk beige/brun capybara-känsla på hennes sida
    koreanska: true, // gillar K-pop och tränar koreanska: hälsning, dagens ord och pepp på koreanska
    arskurs: 3,
    namn: "Edith",
    info: "Åk 3 · Skärgårdsstadsskolan",
    alder: 9,
    farg: "#8B5E3C",
    ljus: "#F3E7D9",
    larstil:
      "9 år, går i åk 3 på Skärgårdsstadsskolan. Tycker om och är duktig i matte. Älskar djur och gillar färger. Använd gärna djur i exempel och mattetal. Gillar K-pop och tränar koreanska, så ett kort koreanskt peppord (t.ex. hwaiting) får gärna slinka med. Mycket enkelt språk, korta meningar.",
  },
];

export function hittaBarn(id) {
  return BARN.find((b) => b.id === id);
}
