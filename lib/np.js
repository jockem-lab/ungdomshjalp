// Nationella prov per årskurs (så som de brukar vara upplagda i grundskolan).
// Skolverket ändrar ibland upplägget, så justera listan här vid behov.

const NP = {
  3: ["Svenska", "Matte"],
  6: ["Svenska", "Engelska", "Matte"],
  9: ["Svenska", "Engelska", "Matte", "Biologi", "Fysik", "Kemi", "Geografi", "Historia", "Religionskunskap", "Samhällskunskap"],
};

// Vilka prov barnet kan träna på: årets prov, annars nästa års.
export function npForBarn(arskurs) {
  if (NP[arskurs]) return { ak: arskurs, amnen: NP[arskurs], iforvag: false };
  const nasta = [3, 6, 9].find((a) => a > arskurs);
  if (!nasta) return null;
  return { ak: nasta, amnen: NP[nasta], iforvag: true };
}

export function giltigtNp(ak, amne) {
  return Boolean(NP[ak] && NP[ak].includes(amne));
}
