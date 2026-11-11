import { BARN } from "./barn";

// Påhittad historik för testläget (adminkod "demo"), så att vyn kan provas utan databas.
export function demoData() {
  const amnen = ["Matte", "Engelska", "SO", "Svenska", "NO"];
  const ut = {};
  let fro = 7;
  for (const b of BARN) {
    const lista = [];
    for (let i = 0; i < 18; i++) {
      fro = (fro * 9301 + 49297) % 233280;
      const dagar = Math.floor((fro / 233280) * 21);
      const amne = amnen[(i + b.namn.length) % amnen.length];
      const antal = 8 + (i % 5);
      lista.push({
        tid: new Date(Date.now() - dagar * 86400000 - i * 3600000).toISOString(),
        typ: i % 4 === 0 ? "kort" : "forhor",
        amne,
        titel: `TESTLÄGE: exempelpass i ${amne}`,
        lage: i % 3 === 0 ? "prov" : "forhor",
        np: i % 7 === 0,
        sekunder: 240 + ((fro >> 3) % 900),
        antal,
        ratt: Math.max(0, antal - (i % 4)),
        besvarade: i % 6 !== 5 ? antal : antal - 4,
        klar: i % 6 !== 5,
      });
    }
    ut[b.id] = lista.sort((a, c) => c.tid.localeCompare(a.tid));
  }
  return ut;
}

