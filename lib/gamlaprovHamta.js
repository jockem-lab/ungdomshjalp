// Körs bara på servern. Hämtar ett gammalt nationellt prov (zip) direkt från Skolverket,
// packar upp det och plockar ut texten så att Claude kan göra ett förhör av det.
// Inget sparas i repot; resultatet ligger bara i minnet en stund (cache per serverinstans).
//
// Så ser zip-filerna ut (kollat på åk 6 matte 2017–2018): själva provet är en PDF
// ("_S90650A_ALLA.pdf"), plus lärarinstruktioner per delprov som Word-filer i två
// varianter ("punktskrift" och "textview") och mappar med punktskriftsfiler (.TEX/.CNT/.PRM).
// Vi skickar provets PDF:er till Claude (de med "ALLA" i namnet först) och lärar-
// instruktionerna i textview som extra text (där kan facit och muntliga delar finnas).
// Punktskrift och svällbilder (taktila bilder) hoppas över.
// Filnamnen i zip-filen är kodade med den gamla DOS-teckentabellen CP437 (ä = 0x84).

import { unzipSync, strFromU8 } from "fflate";

const MAX_TEXT = 90000; // tecken till Claude (ca 25 000 tokens)
const MAX_TEXT_MED_PDF = 40000; // när provet finns som PDF är texten bara ett komplement
const MAX_PDF = 12 * 1024 * 1024; // byte totalt (Claude tar emot upp till 32 MB per anrop)
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

// CP437, tecknen 0x80–0xFF. fflate läser namn utan UTF-8-flagga som Latin-1, så vi
// översätter de tecknen till rätt bokstäver (annars blir "läsåret" till "lÂ„sÂ†ret").
const CP437 =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀" +
  "αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u00a0";
export function fixaNamn(namn) {
  if (!/[\u0080-\u00ff]/.test(namn)) return namn;
  return namn.replace(/[\u0080-\u00ff]/g, (c) => CP437[c.charCodeAt(0) - 0x80] || c);
}

function hoppaOver(namn) {
  return /sv[aä]ll|tactile|taktil|punktskrift/i.test(namn);
}

function plocka(filer, ut, djup) {
  const namnen = Object.keys(filer).sort((a, b) => a.localeCompare(b, "sv"));
  for (const raNamn of namnen) {
    const data = filer[raNamn];
    const namn = fixaNamn(raNamn);
    if (!data || data.length === 0 || namn.endsWith("/") || /__MACOSX|\/\./.test(namn)) continue;
    const kort = namn.toLowerCase();
    ut.filnamn.push(namn);
    if (hoppaOver(namn)) continue;
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

  // Provets PDF:er först: "ALLA" (hela provet) före andra, sedan minsta filerna.
  const vikt = (n) => (/alla/i.test(n.split("/").pop()) ? 0 : 1);
  const pdfer = [];
  let byte = 0;
  for (const p of [...ut.pdfer].sort((a, b) => vikt(a.namn) - vikt(b.namn) || a.data.length - b.data.length)) {
    if (pdfer.length >= 3 || byte + p.data.length > MAX_PDF) continue;
    byte += p.data.length;
    pdfer.push({ namn: p.namn, base64: Buffer.from(p.data).toString("base64") });
  }

  // Text: allt om det inte fanns någon PDF, annars som komplement med mindre utrymme.
  let kvar = pdfer.length ? MAX_TEXT_MED_PDF : MAX_TEXT;
  const texter = [];
  for (const t of ut.texter) {
    const text = snygga(t.text);
    if (text.length < 20 || kvar <= 0) continue;
    texter.push({ namn: t.namn, text: text.slice(0, kvar) });
    kvar -= text.length;
  }

  if (texter.length === 0 && pdfer.length === 0) {
    throw new Error("Hittade ingen text i provfilen");
  }
  const data = { texter, pdfer, filnamn: ut.filnamn };
  cache.set(url, { tid: Date.now(), data });
  return data;
}
