// Gamla nationella prov som Skolverket har släppt fria från sekretess ("får användas").
// Källa: https://www.skolverket.se/prov-och-bedomning/nationella-prov/bestall-nationella-prov/gamla-nationella-prov
//
// Repot är publikt och Skolverket ger ingen licens för att sprida proven vidare,
// så här finns BARA länkar. Servern hämtar zip-filen från Skolverket när ett barn
// tränar (lib/gamlaprovHamta.js) och inget provinnehåll sparas i repot.
// Ämnesnamnen följer lib/np.js.

export const SKOLVERKET_SIDA =
  "https://www.skolverket.se/prov-och-bedomning/nationella-prov/bestall-nationella-prov/gamla-nationella-prov";

const SV = "https://www.skolverket.se/download/";

const PROV = [
  // Åk 3: en gemensam zip med både matte och svenska/SVA.
  { ak: 3, amne: "Matte", ar: "", fil: SV + "18.3c2b09f618aadf1e779406/1695908820785/Matematik_svsva_ak3.zip",
    mer: "https://www.su.se/enheter/prim-gruppen/nationella-prov/arskurs-3" },
  { ak: 3, amne: "Svenska", ar: "", fil: SV + "18.3c2b09f618aadf1e779406/1695908820785/Matematik_svsva_ak3.zip",
    mer: "https://www.natprov.nordiska.uu.se/ak3/exempel/" },

  { ak: 6, amne: "Svenska", ar: "2017–2018", fil: SV + "18.3c2b09f618aadf1e779409/1695908822039/Svsva_ak6_2017-2018.zip",
    mer: "https://www.uu.se/nationella-prov/svenska-och-svenska-som-andrasprak/grundskolan/ak6/exempel" },
  { ak: 6, amne: "Engelska", ar: "2017–2018", fil: SV + "18.3c2b09f618aadf1e7793ff/1695908818651/Engelska_ak6_2017-2018.zip",
    mer: "https://www.gu.se/nationella-prov-frammande-sprak/prov-och-bedomningsstod-i-engelska/exempel-pa-uppgiftstyper" },
  { ak: 6, amne: "Matte", ar: "2017–2018", fil: SV + "18.3c2b09f618aadf1e779404/1695908819987/Matematik_ak6_2017-2018.zip",
    mer: "https://www.su.se/enheter/prim-gruppen/nationella-prov/arskurs-6" },

  { ak: 9, amne: "Svenska", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e77940a/1695908822723/Svsva_ak9_2016-2017.zip",
    mer: "https://www.uu.se/nationella-prov/svenska-och-svenska-som-andrasprak/grundskolan/ak9/exempel" },
  { ak: 9, amne: "Engelska", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779400/1695908818980/Engelska_ak9_2016-2017.zip",
    mer: "https://www.gu.se/nationella-prov-frammande-sprak/prov-och-bedomningsstod-i-engelska/exempel-pa-uppgiftstyper" },
  { ak: 9, amne: "Matte", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779405/1695908820267/Matematik_ak9_2016-2017.zip" },
  { ak: 9, amne: "Biologi", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e7793fe/1695908818542/Biologi_ak9_2016-2017.zip",
    mer: "https://www.umu.se/institutionen-for-tillampad-utbildningsvetenskap/np/no9/tidigare-givna-prov/" },
  { ak: 9, amne: "Fysik", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779401/1695908819395/Fysik_ak9_2016-2017.zip",
    mer: "https://www.umu.se/institutionen-for-tillampad-utbildningsvetenskap/np/no9/tidigare-givna-prov/" },
  { ak: 9, amne: "Kemi", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779403/1695908819826/Kemi_ak9_2016-2017.zip",
    mer: "https://www.umu.se/institutionen-for-tillampad-utbildningsvetenskap/np/no9/tidigare-givna-prov/" },
  { ak: 9, amne: "Historia", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779402/1695908819572/Historia_ak9_2016-2017.zip",
    mer: "https://mau.se/om-oss/fakulteter-och-institutioner/larande-och-samhalle/nationellt-prov-historia/" },
  { ak: 9, amne: "Religionskunskap", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779407/1695908821758/Religion_ak9_2016-2017.zip",
    mer: "https://www.gu.se/didaktik-pedagogisk-profession/nationella-prov-i-religionskunskap" },
  { ak: 9, amne: "Samhällskunskap", ar: "2016–2017", fil: SV + "18.3c2b09f618aadf1e779408/1695908821958/Samh%C3%A4llskunskap_ak9_2016-2017.zip",
    mer: "https://www.gu.se/nationella-prov-i-samhallskunskap" },
  // Geografi: ingen zip hos Skolverket, bara Uppsala universitets sida.
  { ak: 9, amne: "Geografi", ar: "", fil: "", mer: "https://www.uu.se/nationella-prov/geografi/aldre-prov-och-bedomningsstod" },
];

export function gammaltProv(ak, amne) {
  return PROV.find((p) => p.ak === Number(ak) && p.amne === amne) || null;
}

// Finns ett gammalt prov som servern kan hämta och träna på?
export function kanTranaGammalt(ak, amne) {
  return Boolean(gammaltProv(ak, amne)?.fil);
}
