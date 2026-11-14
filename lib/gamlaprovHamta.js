// Körs bara på servern. Hämtar ett gammalt nationellt prov (zip) direkt från Skolverket,
// packar upp det och plockar ut texten så att Claude kan göra ett förhör av det.
// Inget sparas i repot; resultatet ligger bara i minnet en stund (cache per serverinstans).
//
// Skolverkets zip-filer är "provuppgifter i textviewformat och svällbilder", alltså
// tillgänglighetsanpassade versioner. Vi vet inte exakt vilka filtyper som finns i varje
// zip, så vi läser det vanligaste: .txt, .rtf, .htm(l), .xml, .docx och, om ingen text
// hittas, .pdf (skickas som dokument till Claude). Svällbilder (taktila bilder) hoppas över.

import { unzipSync, strFromU8 } from "fflate";

const MAX_TEXT = 90000; // tecken till Claude (ca 25 000 tokens)
const MAX_PDF = 6 * 1024 * 1024; // byte totalt om vi måste skicka PDF:er
const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

const NIVA_ZIP = 2; // zip i zip packas upp, men inte djupare än så

function avkodaText(u8) {
  const utf8 = strFromU8(u8);
  // Ogiltig UTF-8 blir "�"; då är filen troligen Windows-1252/Latin-1.
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(u8);
}

function rensaXml(xml) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>|<br\s*\/?>|<\/p>|<\/div>|<\/h\d>|<\/li>|<\/tr>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function rensaRtf(rtf) {
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => new TextDecoder("windows-1252").decode(new Uint8Array([parseInt(h, 16)])))
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode((Number(n) + 65536) % 65536))
    .replace(/\\(par|line)\b ?/g, "\n")
    .replace(/\\tab\b ?/g, "\t")
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "");
}

function arSvallbild(namn) {
  return /sv[aä]ll|tactile|taktil/i.test(namn);
}

function plocka(filer, ut, djup) {
  const namnen = Object.keys(filer).sort((a, b) => a.localeCompare(b, "sv"));
  for (const namn of namnen) {
    const data = filer[namn];
    if (!data || data.length === 0 || namn.endsWith("/") || /__MACOSX|\/\./.test(namn)) continue;
    const kort = namn.toLowerCase();
    ut.filnamn.push(namn);
    if (arSvallbild(namn)) continue;
    try {
      if (kort.endsWith(".zip") && djup < NIVA_ZIP) {
        plocka(unzipSync(data), ut, djup + 1);
      } else if (kort.endsWith(".txt")) {
        ut.texter.push({ namn, text: avkodaText(data) });
      } else if (kort.endsWith(".rtf")) {
        ut.texter.push({ namn, text: rensaRtf(avkodaText(data)) });
      } else if (/\.(x?html?|xml)$/.test(kort)) {
        ut.texter.push({ namn, text: rensaXml(avkodaText(data)) });
      } else if (kort.endsWith(".docx")) {
        const inre = unzipSync(data, { filter: (f) => f.name === "word/document.xml" });
        const xml = inre["word/document.xml"];
        if (xml) ut.texter.push({ namn, text: rensaXml(strFromU8(xml)) });
      } else if (kort.endsWith(".pdf")) {
        ut.pdfer.push({ namn, data });
      }
    } catch (e) {
      console.warn("Kunde inte läsa", namn, e?.message);
    }
  }
}

function snygga(text) {
  return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Returnerar { texter: [{namn, text}], pdfer: [{namn, base64}], filnamn: [...] }
export async function hamtaGammaltProv(url) {
  const tidigare = cache.get(url);
  if (tidigare && Date.now() - tidigare.tid < CACHE_MS) return tidigare.data;

  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (laxhjalp)" }, cache: "no-store" });
  if (!r.ok) throw new Error(`Skolverket svarade ${r.status}`);
  const zip = new Uint8Array(await r.arrayBuffer());

  const ut = { texter: [], pdfer: [], filnamn: [] };
  plocka(unzipSync(zip), ut, 0);

  let kvar = MAX_TEXT;
  const texter = [];
  for (const t of ut.texter) {
    const text = snygga(t.text);
    if (text.length < 20 || kvar <= 0) continue;
    texter.push({ namn: t.namn, text: text.slice(0, kvar) });
    kvar -= text.length;
  }

  // PDF bara om det inte fanns någon text att läsa. Minsta filerna först.
  const pdfer = [];
  if (texter.length === 0) {
    let byte = 0;
    for (const p of [...ut.pdfer].sort((a, b) => a.data.length - b.data.length)) {
      if (pdfer.length >= 3 || byte + p.data.length > MAX_PDF) continue;
      byte += p.data.length;
      pdfer.push({ namn: p.namn, base64: Buffer.from(p.data).toString("base64") });
    }
  }

  if (texter.length === 0 && pdfer.length === 0) {
    throw new Error("Hittade ingen text i provfilen");
  }
  const data = { texter, pdfer, filnamn: ut.filnamn };
  cache.set(url, { tid: Date.now(), data });
  return data;
}
