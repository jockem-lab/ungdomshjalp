// Testläge: logga in med familjekoden "demo" så får man påhittade förhör
// utan att Claude anropas. Kostar alltså inga krediter.

export const DEMOKOD = "demo";

export function arDemo(kod) {
  return String(kod || "").trim().toLowerCase() === DEMOKOD;
}

const fraga = (f) => ({ godkanda: [], lasupp: "", lasupp_sprak: "", alternativ: [], ...f });

export function demoForhor(amne, np) {
  const f = demoBas(amne);
  if (np) {
    return {
      ...f,
      titel: `Testövningsprov ${np.amne} åk ${np.ak}`,
      lastext: np.amne === "Engelska"
        ? "Tom has a small dog called Max. Every morning they walk to the park. Max loves to chase birds, but he never catches any."
        : "Det här är en påhittad lästext i testläget. Riktiga övningsprov får en längre text som frågorna bygger på.",
      lastext_sprak: np.amne === "Engelska" ? "en-GB" : "sv-SE",
    };
  }
  return { lastext: "", lastext_sprak: "", ...f };
}

function demoBas(amne) {
  if (amne.typ === "sprak" && amne.sprak && amne.sprak !== "sv-SE") {
    return {
      titel: `Testglosor i ${amne.namn}`,
      amne: amne.namn,
      sammanfattning: "Det här är ett påhittat testförhör. Inga krediter används.",
      nyckelpunkter: [],
      fragor: [
        fraga({ typ: "flerval", fraga: 'Vad betyder "dog"?', alternativ: ["hund", "katt", "häst"], ratt: "hund",
          ledtrad: "Den säger voff.", forklaring: "dog = hund", lasupp: "dog", lasupp_sprak: amne.sprak }),
        fraga({ typ: "skriv", fraga: 'Skriv "katt" på engelska.', ratt: "cat", ledtrad: "Tre bokstäver, börjar på c.",
          forklaring: "katt = cat", lasupp: "cat", lasupp_sprak: amne.sprak }),
        fraga({ typ: "flerval", fraga: 'Vad betyder "house"?', alternativ: ["hus", "häst", "hatt"], ratt: "hus",
          ledtrad: "Man bor i det.", forklaring: "house = hus", lasupp: "house", lasupp_sprak: amne.sprak }),
      ],
    };
  }
  if (amne.typ === "matte") {
    return {
      titel: "Testförhör i matte",
      amne: amne.namn,
      sammanfattning: "Det här är ett påhittat testförhör. Inga krediter används.",
      nyckelpunkter: ["Gånger är upprepad addition: 3 · 4 = 4 + 4 + 4."],
      fragor: [
        fraga({ typ: "skriv", fraga: "Hur mycket är 3 · 4?", ratt: "12", ledtrad: "Räkna 4 + 4 + 4.", forklaring: "4 + 4 + 4 = 12" }),
        fraga({ typ: "flerval", fraga: "Vad är hälften av 18?", alternativ: ["9", "8", "6"], ratt: "9",
          ledtrad: "Dela 18 i två lika delar.", forklaring: "18 / 2 = 9" }),
      ],
    };
  }
  return {
    titel: `Testförhör i ${amne.namn}`,
    amne: amne.namn,
    sammanfattning: "Det här är ett påhittat testförhör om vikingatiden. Inga krediter används.",
    nyckelpunkter: [
      "Vikingatiden var ungefär år 800–1050.",
      "Vikingarna reste på handelsresor och plundringståg.",
      "De flesta vikingar var bönder.",
    ],
    fragor: [
      fraga({ typ: "flerval", fraga: "Vad gjorde de flesta vikingar till vardags?", alternativ: ["Var bönder", "Var krigare", "Var kungar"],
        ratt: "Var bönder", ledtrad: "Någon måste odla maten.", forklaring: "De flesta vikingar levde på jordbruk." }),
      fraga({ typ: "flerval", fraga: "Varför reste vikingarna långt?", alternativ: ["För att handla och plundra", "För att gå i skolan", "För att åka på semester"],
        ratt: "För att handla och plundra", ledtrad: "De ville få tag på saker.", forklaring: "Handel och plundring gav rikedomar." }),
    ],
  };
}
