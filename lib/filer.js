// Läser filer som barnen laddar upp (t.ex. från Google Classroom) direkt i webbläsaren.
// PDF skickas som den är till Claude. Word (.docx) och PowerPoint (.pptx) är zip-filer
// med XML inuti, så vi packar upp dem här och skickar bara texten.

export const MAX_PDF = 2.5 * 1024 * 1024; // Vercel tar emot högst ca 4,5 MB per anrop
export const MAX_TEXT = 60000;
export const FIL_ACCEPT =
  ".pdf,.docx,.pptx,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function filtyp(fil) {
  const n = fil.name.toLowerCase();
  if (n.endsWith(".pdf") || fil.type === "application/pdf") return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".pptx")) return "pptx";
  if (n.endsWith(".doc") || n.endsWith(".ppt")) return "gammal";
  return "okand";
}

function lasSomDataUrl(fil) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Kunde inte läsa filen."));
    r.readAsDataURL(fil);
  });
}

// Minimal zip-läsare: hittar filerna via zip-filens innehållsförteckning i slutet.
async function packaUpp(buffer, villNamn) {
  const v = new DataView(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Filen verkar vara trasig.");
  const antal = v.getUint16(eocd + 10, true);
  let pos = v.getUint32(eocd + 16, true);
  const avkoda = new TextDecoder();
  const ut = {};
  for (let k = 0; k < antal; k++) {
    if (v.getUint32(pos, true) !== 0x02014b50) break;
    const metod = v.getUint16(pos + 10, true);
    const storlek = v.getUint32(pos + 20, true);
    const nLen = v.getUint16(pos + 28, true);
    const eLen = v.getUint16(pos + 30, true);
    const cLen = v.getUint16(pos + 32, true);
    const lokal = v.getUint32(pos + 42, true);
    const namn = avkoda.decode(new Uint8Array(buffer, pos + 46, nLen));
    pos += 46 + nLen + eLen + cLen;
    if (!villNamn(namn)) continue;
    const start = lokal + 30 + v.getUint16(lokal + 26, true) + v.getUint16(lokal + 28, true);
    const data = new Uint8Array(buffer, start, storlek);
    if (metod === 0) ut[namn] = avkoda.decode(data);
    else if (metod === 8) {
      const strom = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      ut[namn] = await new Response(strom).text();
    }
  }
  return ut;
}

function avkodaXml(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

// Plockar ut texten stycke för stycke. tagg är "w" för Word och "a" för PowerPoint.
function xmlTillText(xml, tagg) {
  return xml
    .split(`</${tagg}:p>`)
    .map((stycke) => {
      const delar = [];
      const re = new RegExp(`<${tagg}:t(?:\\s[^>]*)?>([^<]*)</${tagg}:t>|<${tagg}:tab/>`, "g");
      let m;
      while ((m = re.exec(stycke))) delar.push(m[1] !== undefined ? avkodaXml(m[1]) : "\t");
      return delar.join("").trim();
    })
    .filter(Boolean)
    .join("\n");
}

export async function lasFil(fil) {
  const typ = filtyp(fil);
  if (typ === "gammal") throw new Error(`${fil.name} är ett gammalt filformat. Spara den som PDF eller .docx/.pptx först.`);
  if (typ === "okand") throw new Error(`${fil.name} kan inte läsas. Välj en PDF, Word- eller PowerPoint-fil.`);
  if (typ === "pdf") {
    if (fil.size > MAX_PDF) throw new Error(`${fil.name} är för stor (max 2,5 MB). Ta skärmdumpar av sidorna du behöver i stället.`);
    return { namn: fil.name, typ: "pdf", data: await lasSomDataUrl(fil) };
  }
  if (typeof DecompressionStream === "undefined") throw new Error("Den här webbläsaren kan inte öppna Word- och PowerPoint-filer. Uppdatera mobilen eller spara filen som PDF.");
  const buffer = await fil.arrayBuffer();
  let text = "";
  if (typ === "docx") {
    const delar = await packaUpp(buffer, (n) => n === "word/document.xml");
    text = xmlTillText(delar["word/document.xml"] || "", "w");
  } else {
    const delar = await packaUpp(buffer, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    text = Object.keys(delar)
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
      .map((n, i) => `Bild ${i + 1}:\n${xmlTillText(delar[n], "a")}`)
      .join("\n\n");
  }
  if (!text.trim()) throw new Error(`Hittade ingen text i ${fil.name}. Om den mest består av bilder, ta skärmdumpar i stället.`);
  return { namn: fil.name, typ: "text", data: text.slice(0, MAX_TEXT) };
}
