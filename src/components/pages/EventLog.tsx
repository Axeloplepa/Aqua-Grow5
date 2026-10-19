import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useSystem, type EvCat, type Level } from "@/lib/system";
import { downloadDocx, fmtDateTime } from "@/lib/records";
import { BTN_GHOST, Empty, INPUT, PageHeader, TD, TH, TableWrap } from "@/components/ui";

const LEVELS: { id: "all" | Level; label: string }[] = [
  { id: "all", label: "All" },
  { id: "info", label: "Info" },
  { id: "warn", label: "Warnings" },
  { id: "alert", label: "Alerts" },
];
const CATS: ("All" | EvCat)[] = ["All", "System", "Sensor", "Valve", "Pump", "Link", "Fertigation", "Account"];
const LEVEL_STYLE: Record<Level, string> = {
  info: "bg-surface-2 text-muted",
  warn: "bg-warn/20 text-warn",
  alert: "bg-bad/20 text-bad",
};
const LEVEL_NAME: Record<Level, string> = { info: "Info", warn: "Warning", alert: "Alert" };

export function EventLog() {
  const { events, clearEvents, readOnly } = useSystem();
  const [level, setLevel] = useState<"all" | Level>("all");
  const [cat, setCat] = useState<"All" | EvCat>("All");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter(
      (e) =>
        (level === "all" || e.level === level) &&
        (cat === "All" || e.cat === cat) &&
        (!needle || e.msg.toLowerCase().includes(needle)),
    );
  }, [events, level, cat, q]);

  function exportWord() {
    downloadDocx(`event-log-${new Date().toISOString().slice(0, 10)}.docx`, "Aqua-Grow Event Log", [
      ["Date & time", "Level", "Category", "Message"],
      ...rows.map((e) => [fmtDateTime(e.ts), LEVEL_NAME[e.level], e.cat, e.msg]),
    ]);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Event log"
        sub={`${rows.length} of ${events.length} events shown · the latest 500 are kept on this device`}
        right={
          <div className="flex flex-wrap gap-2">
            <button onClick={exportWord} disabled={rows.length === 0} className={BTN_GHOST}>
              <Download size={16} /> Download Word document
            </button>
            {!readOnly && <button
              onClick={() => { if (window.confirm("Clear the whole event log on this device?")) clearEvents(); }}
              disabled={events.length === 0}
              className={BTN_GHOST}
            >
              <Trash2 size={16} /> Clear
            </button>}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex rounded-full border border-line bg-sidebar p-1" role="group" aria-label="Filter by level">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`rounded-full px-3 py-1 text-sm font-bold ${level === l.id ? "bg-surface-2 text-ink" : "text-muted"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <label className="text-xs font-semibold text-faint">
          Category
          <select value={cat} onChange={(e) => setCat(e.target.value as "All" | EvCat)} className={`${INPUT} mt-1 w-auto`}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs font-semibold text-faint">
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the log…" className={INPUT} />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-surface"><Empty>No events match.</Empty></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {["Date & time", "Level", "Category", "Message"].map((h) => <th key={h} className={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className={`${TD} text-faint`}>{fmtDateTime(e.ts)}</td>
                <td className={TD}>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[e.level]}`}>{LEVEL_NAME[e.level]}</span>
                </td>
                <td className={TD}>{e.cat}</td>
                <td className={`${TD} whitespace-normal`}>{e.msg}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
