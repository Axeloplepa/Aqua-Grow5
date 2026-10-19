/** Water-operation records, daily totals, formatting and Word export helpers. */

export type Feed = {
  id: string;
  t: number;
  b1: number | null;
  b2: number | null;
  flow: number | null;
  pump: number | null;
};

/** One pump run: starts when the pump turns on, ends when it stops. */
export type Op = {
  id: string;
  start: number;
  end: number;
  open: boolean;
  seconds: number;
  liters: number;
  peak: number;
  b1Start: number | null;
  b1End: number | null;
  b2Start: number | null;
  b2End: number | null;
};

export type DayTotal = { day: string; count: number; liters: number; seconds: number };

const MAX_GAP_MS = 5 * 60 * 1000; // a longer silence means the data stream broke
const CAP_MS = 90 * 1000; // never count more than this per reading
const LIVE_MS = 3 * 60 * 1000; // newest reading younger than this = operation still running

const isRunning = (f: Feed) => (f.pump != null ? f.pump > 0 : (f.flow ?? 0) > 0);

/**
 * Rebuilds the list of operations from the ThingSpeak readings.
 * Each operation is recorded on its own: when the pump stops the record is closed,
 * and the next time it starts a brand-new record (with liters back at 0) begins.
 * Liters = flow (L/min) x time between readings.
 */
export function deriveOps(feeds: Feed[]): Op[] {
  const out: Op[] = [];
  let cur: Op | null = null;
  let skipping = false; // pump was already on when the data window starts: start time unknown

  const close = (end: number, open: boolean) => {
    if (!cur) return;
    out.push({ ...cur, end, open, seconds: Math.max(0, (end - cur.start) / 1000) });
    cur = null;
  };

  feeds.forEach((f, i) => {
    const prev = i > 0 ? feeds[i - 1] : null;
    if (cur && prev) {
      const dt = f.t - prev.t;
      if (dt > MAX_GAP_MS) {
        cur.liters += ((prev.flow ?? 0) * CAP_MS) / 60000;
        close(prev.t + CAP_MS, false);
      } else {
        cur.liters += ((prev.flow ?? 0) * dt) / 60000;
      }
    }
    if (!isRunning(f)) {
      skipping = false;
      if (cur) {
        cur.b1End = f.b1;
        cur.b2End = f.b2;
        close(f.t, false);
      }
      return;
    }
    if (skipping) return;
    if (!cur) {
      if (i === 0) {
        skipping = true;
        return;
      }
      cur = {
        id: String(f.t),
        start: f.t,
        end: f.t,
        open: false,
        seconds: 0,
        liters: 0,
        peak: 0,
        b1Start: f.b1,
        b1End: f.b1,
        b2Start: f.b2,
        b2End: f.b2,
      };
    }
    cur.peak = Math.max(cur.peak, f.flow ?? 0);
    cur.b1End = f.b1;
    cur.b2End = f.b2;
  });

  if (cur) {
    const last = feeds[feeds.length - 1];
    const live = Date.now() - last.t < LIVE_MS;
    close(live ? last.t : last.t + CAP_MS, live);
  }
  return out;
}

/** Keeps operations remembered from earlier visits; freshly derived records win. */
export function mergeOps(archive: Op[], derived: Op[]): Op[] {
  const map = new Map<string, Op>();
  archive.forEach((o) => map.set(o.id, o));
  derived.forEach((o) => map.set(o.id, o));
  return [...map.values()].sort((a, b) => b.start - a.start);
}

export function dailyTotals(ops: Op[]): DayTotal[] {
  const map = new Map<string, DayTotal>();
  ops.forEach((o) => {
    const day = dayKey(o.start);
    const t = map.get(day) ?? { day, count: 0, liters: 0, seconds: 0 };
    t.count += 1;
    t.liters += o.liters;
    t.seconds += o.seconds;
    map.set(day, t);
  });
  return [...map.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

/* ---------- formatting ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const fmtDateTime = (ts: number) => `${dayKey(ts)} ${fmtTime(ts)}`;

export function fmtDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

export function fmtDur(totalSeconds: number) {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${m}m ${r}s`;
  if (m) return `${m}m ${r}s`;
  return `${r}s`;
}

export const fmtLiters = (l: number) => l.toFixed(2);

export function ago(ts: number | null, now: number) {
  if (ts == null) return "--";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 90) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/* ---------- Microsoft Word DOCX export ---------- */

type Cell = string | number | null | undefined;

const xmlEscape = (value: unknown) => String(value ?? "—")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries: { name: string; content: string }[]) {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => [v & 255, (v >>> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const data = enc.encode(entry.content);
    const crc = crc32(data);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
      ...name, ...data,
    ]);
    localParts.push(local);
    const central = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name,
    ]);
    centralParts.push(central);
    offset += local.length;
  }
  const centralSize = centralParts.reduce((n, p) => n + p.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);
  return new Blob([...localParts, ...centralParts, end], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function wordRun(value: unknown, bold = false) {
  const text = xmlEscape(value);
  return `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;
}

export function downloadDocxSections(
  filename: string,
  title: string,
  sections: { heading: string; rows: Cell[][] }[],
  intro: string[] = [],
) {
  const paragraph = (value: unknown, style = "Normal") => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${wordRun(value, style !== "Normal")}</w:p>`;
  const table = (rows: Cell[][]) => {
    const safeRows = rows.length ? rows : [["No records available"]];
    const tableRows = safeRows.map((row, ri) => `<w:tr>${row.map(cell =>
      `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/>${ri === 0 ? "<w:shd w:fill=\"DDEFE8\"/>" : ""}</w:tcPr><w:p>${wordRun(cell, ri === 0)}</w:p></w:tc>`
    ).join("")}</w:tr>`).join("");
    return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7CEC5"/><w:left w:val="single" w:sz="4" w:color="B7CEC5"/><w:bottom w:val="single" w:sz="4" w:color="B7CEC5"/><w:right w:val="single" w:sz="4" w:color="B7CEC5"/><w:insideH w:val="single" w:sz="4" w:color="B7CEC5"/><w:insideV w:val="single" w:sz="4" w:color="B7CEC5"/></w:tblBorders></w:tblPr>${tableRows}</w:tbl>`;
  };
  const body = paragraph(title, "Title") +
    paragraph("Development of a Soil Moisture-Based Automated Irrigation and Fertigation System", "Subtitle") +
    paragraph("Roxas City School for Philippine Craftsmen · Group 5") +
    paragraph(`Generated: ${new Date().toLocaleString()}`) +
    intro.map((line) => paragraph(line)).join("") +
    sections.map((section) => paragraph(section.heading, "Heading1") + table(section.rows)).join("") +
    paragraph("Generated by Aqua-Grow from the records available in the application. Missing records mean no data was available for that section during the selected period.");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="450" w:footer="450" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const blob = makeZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", content: documentXml },
    { name: "word/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:b/><w:color w:val="16765B"/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="526D72"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="100"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="16765B"/><w:sz w:val="26"/></w:rPr></w:style></w:styles>` },
  ]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.toLowerCase().endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadDocx(filename: string, title: string, rows: Cell[][]) {
  downloadDocxSections(filename, title, [{ heading: "Records", rows }]);
}
