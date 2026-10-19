import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useSystem } from "@/lib/system";
import { dailyTotals, dayKey, downloadDocx, downloadDocxSections, fmtDateTime, fmtLiters, fmtTime } from "@/lib/records";
import { BTN, Card, INPUT, PageHeader } from "@/components/ui";

const stamp = () => new Date().toISOString().slice(0, 10);

export function DataExport() {
  const { feeds, ops, fert, events, pump, v1, v2, status, source } = useSystem();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = useMemo(() => {
    const a = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
    const b = to ? new Date(to + "T23:59:59.999").getTime() : Infinity;
    return (ts: number) => ts >= a && ts <= b;
  }, [from, to]);

  const feedRows = useMemo(() => feeds.filter((f) => inRange(f.t)), [feeds, inRange]);
  const opRows = useMemo(() => ops.filter((o) => inRange(o.start)).sort((a, b) => a.start - b.start), [ops, inRange]);
  const dayRows = useMemo(() => dailyTotals(opRows).sort((a, b) => (a.day < b.day ? -1 : 1)), [opRows]);
  const fertRows = useMemo(() => fert.filter((f) => inRange(f.ts)).sort((a, b) => a.ts - b.ts), [fert, inRange]);
  const evRows = useMemo(() => events.filter((e) => inRange(e.ts)).sort((a, b) => a.ts - b.ts), [events, inRange]);

  const [reportDay, setReportDay] = useState(() => stamp());

  function downloadDailyWord() {
    const opsD = opRows.filter((o) => dayKey(o.start) === reportDay);
    const feedsD = feedRows.filter((f) => dayKey(f.t) === reportDay);
    const fertD = fertRows.filter((f) => dayKey(f.ts) === reportDay);
    const eventsD = evRows.filter((e) => dayKey(e.ts) === reportDay);
    const moisture = (key: "b1" | "b2") => {
      const vals = feedsD.map((f) => f[key]).filter((v): v is number => v != null);
      if (!vals.length) return "No readings";
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return `${Math.min(...vals)}–${Math.max(...vals)}% (average ${avg.toFixed(1)}%)`;
    };
    const liters = opsD.reduce((a, o) => a + o.liters, 0);
    const seconds = opsD.reduce((a, o) => a + o.seconds, 0);
    downloadDocxSections(`aqua-grow-daily-report-${reportDay}.docx`, "Aqua-Grow Daily Report", [
      { heading: "Daily summary", rows: [["Metric", "Value"], ["Report date", reportDay], ["Watering operations", opsD.length], ["Total water used (L)", fmtLiters(liters)], ["Total pump run time (seconds)", Math.round(seconds)], ["Bed 1 moisture", moisture("b1")], ["Bed 2 moisture", moisture("b2")], ["Current pump status", pump ? "ON" : "OFF"], ["Valve 1 status", v1 ? "ON" : "OFF"], ["Valve 2 status", v2 ? "ON" : "OFF"], ["Data connection", `${status} (${source})`]] },
      { heading: "Soil moisture readings", rows: [["Time", "Bed 1 (%)", "Bed 2 (%)", "Flow (L/min)", "Pump"], ...feedsD.map((f) => [fmtTime(f.t), f.b1 ?? "—", f.b2 ?? "—", f.flow ?? "—", f.pump == null ? "—" : f.pump > 0 ? "ON" : "OFF"])] },
      { heading: "Irrigation operations", rows: [["Start", "End", "Duration (s)", "Water (L)", "Peak flow", "Bed 1 moisture", "Bed 2 moisture"], ...opsD.map((o) => [fmtTime(o.start), o.open ? "Still running" : fmtTime(o.end), Math.round(o.seconds), fmtLiters(o.liters), o.peak.toFixed(1), `${o.b1Start ?? "—"} → ${o.b1End ?? "—"}`, `${o.b2Start ?? "—"} → ${o.b2End ?? "—"}`])] },
      { heading: "Fertigation records", rows: [["Time", "Fertilizer", "Bed", "Amount / mix", "Notes", "Recorded by"], ...fertD.map((f) => [fmtTime(f.ts), f.fertilizer, f.bed, f.amount, f.note, f.by])] },
      { heading: "System event log", rows: [["Time", "Level", "Category", "Event"], ...eventsD.map((e) => [fmtTime(e.ts), e.level.toUpperCase(), e.cat, e.msg])] },
    ], ["Roxas City School for Philippine Craftsmen · Group 5", "Report includes records available in Aqua-Grow for the selected date."]);
  }

  const sets = [
    {
      title: "Sensor readings",
      desc: "Soil moisture of both beds, flow rate and pump state from ThingSpeak.",
      count: feedRows.length,
      run: () => downloadDocx(`sensor-readings-${stamp()}.docx`, "Aqua-Grow Sensor Readings", [
        ["Date & time", "Bed 1 moisture (%)", "Bed 2 moisture (%)", "Flow (L/min)", "Pump (1=on)"],
        ...feedRows.map((f) => [fmtDateTime(f.t), f.b1, f.b2, f.flow, f.pump]),
      ]),
    },
    {
      title: "Water operations",
      desc: "Each pump run with start, end, duration, liters used and bed moisture before and after.",
      count: opRows.length,
      run: () => downloadDocx(`water-operations-${stamp()}.docx`, "Aqua-Grow Water Operations", [
        ["Date", "Start", "End", "Duration (s)", "Liters", "Peak flow (L/min)", "Bed 1 start (%)", "Bed 1 end (%)", "Bed 2 start (%)", "Bed 2 end (%)"],
        ...opRows.map((o) => [
          dayKey(o.start), fmtTime(o.start), o.open ? "running" : fmtTime(o.end), Math.round(o.seconds),
          fmtLiters(o.liters), o.peak.toFixed(1), o.b1Start, o.b1End, o.b2Start, o.b2End,
        ]),
      ]),
    },
    {
      title: "Daily water totals",
      desc: "Number of operations, total liters and total pump time for each day.",
      count: dayRows.length,
      run: () => downloadDocx(`daily-water-totals-${stamp()}.docx`, "Aqua-Grow Daily Water Totals", [
        ["Date", "Operations", "Liters", "Pump run time (s)"],
        ...dayRows.map((d) => [d.day, d.count, fmtLiters(d.liters), Math.round(d.seconds)]),
      ]),
    },
    {
      title: "Fertigation records",
      desc: "Date, fertilizer type, bed, amount, notes and who recorded it.",
      count: fertRows.length,
      run: () => downloadDocx(`fertigation-${stamp()}.docx`, "Aqua-Grow Fertigation Records", [
        ["Date & time", "Fertilizer", "Bed", "Amount / mix", "Notes", "Recorded by"],
        ...fertRows.map((f) => [fmtDateTime(f.ts), f.fertilizer, f.bed, f.amount, f.note, f.by]),
      ]),
    },
    {
      title: "Event log",
      desc: "Valve, pump, sensor, connection and account events.",
      count: evRows.length,
      run: () => downloadDocx(`event-log-${stamp()}.docx`, "Aqua-Grow Event Log", [
        ["Date & time", "Level", "Category", "Message"],
        ...evRows.map((e) => [fmtDateTime(e.ts), e.level, e.cat, e.msg]),
      ]),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Data export" sub="Download editable Microsoft Word documents for your selected date range." />

      <Card className="mb-4 flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold text-muted">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${INPUT} w-auto`} />
        </label>
        <label className="text-sm font-semibold text-muted">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${INPUT} w-auto`} />
        </label>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="pb-2.5 text-sm font-bold text-leaf hover:underline">
            Clear dates
          </button>
        )}
        <p className="basis-full text-xs text-faint">Leave both dates empty to export everything available.</p>
      </Card>

      <Card className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-bold">Daily Word report</h3>
          <p className="text-sm text-muted">Download an editable Microsoft Word report with sensor readings, irrigation operations, pump and valve status, fertigation records, and events.</p>
          <label className="mt-3 block text-sm font-semibold text-muted">
            Report date
            <input type="date" value={reportDay} onChange={(e) => setReportDay(e.target.value)} className={`${INPUT} w-auto`} />
          </label>
        </div>
        <button onClick={downloadDailyWord} className={BTN}><FileText size={16} /> Download Word report</button>
      </Card>

      <div className="grid gap-3">
        {sets.map((s) => (
          <Card key={s.title} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold">{s.title}</h3>
              <p className="text-sm text-muted">{s.desc}</p>
              <p className="mt-1 text-xs text-faint">{s.count} row{s.count === 1 ? "" : "s"}</p>
            </div>
            <button onClick={s.run} disabled={s.count === 0} className={BTN}>
              <Download size={16} /> Download Word document
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
