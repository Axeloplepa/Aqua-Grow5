import { useMemo, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { useSystem } from "@/lib/system";
import { ago, dayKey, fmtDateTime } from "@/lib/records";
import { BTN, Card, Empty, INPUT, Metric, PageHeader, SectionTitle, TD, TH, TableWrap } from "@/components/ui";

const PRESETS = [
  "Urea (46-0-0)",
  "Complete fertilizer (14-14-14)",
  "Ammonium sulfate (21-0-0)",
  "NPK (16-16-16)",
  "Vermicompost / organic tea",
  "Other",
];
const BEDS = ["Bed 1", "Bed 2", "Both beds"];

const pad = (n: number) => String(n).padStart(2, "0");
function localInput(ts: number) {
  const d = new Date(ts);
  return `${dayKey(ts)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Fertigation() {
  const { fert, addFert, removeFert, now, readOnly } = useSystem();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [custom, setCustom] = useState("");
  const [amount, setAmount] = useState("");
  const [bed, setBed] = useState(BEDS[2]);
  const [when, setWhen] = useState(() => localInput(Date.now()));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const last = fert[0];
  const weekCount = useMemo(() => fert.filter((f) => now - f.ts < 7 * 86400000).length, [fert, now]);
  const favourite = useMemo(() => {
    const m = new Map<string, number>();
    fert.forEach((f) => m.set(f.fertilizer, (m.get(f.fertilizer) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "--";
  }, [fert]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = preset === "Other" ? custom.trim() : preset;
    if (!name) { setErr("Type the name of the fertilizer."); return; }
    const ts = new Date(when).getTime();
    if (Number.isNaN(ts)) { setErr("Choose a valid date and time."); return; }
    setErr("");
    addFert({ ts, fertilizer: name, amount: amount.trim(), bed, note: note.trim() });
    setCustom(""); setAmount(""); setNote("");
    setWhen(localInput(Date.now()));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Fertigation" sub="Record which fertilizer was used each time the beds were fertigated." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Last fertigation" value={last ? ago(last.ts, now) : "None yet"} sub={last ? fmtDateTime(last.ts) : "Add the first record below"} />
        <Metric label="Last fertilizer" value={last ? last.fertilizer : "--"} sub={last ? `${last.bed}${last.amount ? " · " + last.amount : ""}` : undefined} />
        <Metric label="Last 7 days" value={String(weekCount)} sub="Fertigation records" />
        <Metric label="Most used" value={favourite} sub={`${fert.length} record${fert.length === 1 ? "" : "s"} in total`} />
      </div>

      {!readOnly && <><SectionTitle>Add a fertigation record</SectionTitle>
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-muted">
            Type of fertilizer
            <select value={preset} onChange={(e) => setPreset(e.target.value)} className={INPUT}>
              {PRESETS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          {preset === "Other" ? (
            <label className="text-sm font-semibold text-muted">
              Fertilizer name
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Potassium nitrate" className={INPUT} />
            </label>
          ) : (
            <label className="text-sm font-semibold text-muted">
              Amount / mix (optional)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50 g in 10 L water" className={INPUT} />
            </label>
          )}
          {preset === "Other" && (
            <label className="text-sm font-semibold text-muted">
              Amount / mix (optional)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50 g in 10 L water" className={INPUT} />
            </label>
          )}
          <label className="text-sm font-semibold text-muted">
            Applied to
            <select value={bed} onChange={(e) => setBed(e.target.value)} className={INPUT}>
              {BEDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-muted">
            Date and time
            <input type="datetime-local" value={when} max={localInput(Date.now() + 60000)} onChange={(e) => setWhen(e.target.value)} className={INPUT} />
          </label>
          <label className="text-sm font-semibold text-muted md:col-span-2">
            Notes (optional)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. after rain, leaves looked pale" className={INPUT} />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button type="submit" className={BTN}>Save record</button>
            {err && <p className="text-sm text-bad">{err}</p>}
          </div>
        </form>
      </Card></>}

      <SectionTitle>History</SectionTitle>
      {fert.length === 0 ? (
        <div className="rounded-card border border-line bg-surface"><Empty>No fertigation records yet.</Empty></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {["Date & time", "Fertilizer", "Bed", "Amount / mix", "Notes", "Recorded by", ""].map((h, i) => (
                <th key={i} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fert.map((f) => (
              <tr key={f.id}>
                <td className={TD}>{fmtDateTime(f.ts)}</td>
                <td className={`${TD} font-bold`}>{f.fertilizer}</td>
                <td className={TD}>{f.bed}</td>
                <td className={TD}>{f.amount || "--"}</td>
                <td className={`${TD} max-w-[16rem] truncate`}>{f.note || "--"}</td>
                <td className={TD}>{f.by}</td>
                {!readOnly && <td className={TD}>
                  <button
                    aria-label="Delete record"
                    onClick={() => { if (window.confirm("Delete this fertigation record?")) removeFert(f.id); }}
                    className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-bad"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <p className="mt-4 text-xs text-faint">Fertigation records are saved in this browser, so they only appear on the device they were entered on. Use Data export to keep a copy.</p>
    </div>
  );
}
