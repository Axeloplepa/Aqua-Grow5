import { useMemo, useState } from "react";
import { useSystem } from "@/lib/system";
import { dailyTotals, dayKey, fmtDay, fmtDur, fmtLiters, fmtTime } from "@/lib/records";
import { Empty, Metric, PageHeader, SectionTitle, TD, TH, TableWrap, INPUT } from "@/components/ui";

const pct = (v: number | null) => (v == null ? "--" : `${Math.round(v)}%`);

export function WaterUsage() {
  const { ops, now, feedsState } = useSystem();
  const [day, setDay] = useState(() => dayKey(Date.now()));

  const totals = useMemo(() => dailyTotals(ops), [ops]);
  const dayOps = useMemo(
    () => ops.filter((o) => dayKey(o.start) === day).sort((a, b) => a.start - b.start),
    [ops, day],
  );
  const sum = totals.find((t) => t.day === day) ?? { day, count: 0, liters: 0, seconds: 0 };
  const running = ops.find((o) => o.open);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Water usage"
        sub="Every pump run is recorded as its own operation, then totaled per day."
        right={
          <label className="text-sm font-semibold text-muted">
            Day
            <input type="date" value={day} max={dayKey(now)} onChange={(e) => e.target.value && setDay(e.target.value)} className={`${INPUT} mt-1 w-auto`} />
          </label>
        }
      />

      {feedsState === "error" && (
        <p className="mb-4 rounded-card border border-line bg-surface px-4 py-3 text-sm text-warn">
          Could not load the ThingSpeak history, so only operations saved earlier on this device are shown.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Operations" value={String(sum.count)} sub={fmtDay(day)} />
        <Metric label="Water used" value={`${fmtLiters(sum.liters)} L`} sub="Total for the day" />
        <Metric label="Pump run time" value={fmtDur(sum.seconds)} sub="Total for the day" />
        <Metric
          label="Running now"
          value={running ? `${fmtLiters(running.liters)} L` : "No"}
          sub={running ? `Since ${fmtTime(running.start)} · ${fmtDur((now - running.start) / 1000)}` : "Pump is idle"}
        />
      </div>

      <SectionTitle>Operations on {fmtDay(day)}</SectionTitle>
      {dayOps.length === 0 ? (
        <div className="rounded-card border border-line bg-surface"><Empty>No pump operations recorded on this day.</Empty></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {["#", "Start", "End", "Duration", "Liters", "Peak L/min", "Bed 1", "Bed 2"].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayOps.map((o, i) => (
              <tr key={o.id}>
                <td className={TD}>{i + 1}</td>
                <td className={TD}>{fmtTime(o.start)}</td>
                <td className={TD}>{o.open ? <span className="font-bold text-ok">Running</span> : fmtTime(o.end)}</td>
                <td className={TD}>{fmtDur(o.seconds)}</td>
                <td className={`${TD} font-bold`}>{fmtLiters(o.liters)}</td>
                <td className={TD}>{o.peak.toFixed(1)}</td>
                <td className={TD}>{pct(o.b1Start)} → {pct(o.b1End)}</td>
                <td className={TD}>{pct(o.b2Start)} → {pct(o.b2End)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <SectionTitle>Daily totals</SectionTitle>
      {totals.length === 0 ? (
        <div className="rounded-card border border-line bg-surface"><Empty>No operations recorded yet.</Empty></div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {["Date", "Operations", "Liters", "Run time"].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.day} onClick={() => setDay(t.day)} className={`cursor-pointer hover:bg-surface-2 ${t.day === day ? "bg-surface-2" : ""}`}>
                <td className={TD}>{fmtDay(t.day)}</td>
                <td className={TD}>{t.count}</td>
                <td className={`${TD} font-bold`}>{fmtLiters(t.liters)}</td>
                <td className={TD}>{fmtDur(t.seconds)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <p className="mt-4 text-xs text-faint">
        An operation starts when the pump turns on and ends when it stops; the next run starts a new record from 0 L.
        Liters are the flow-meter reading multiplied by the time between ThingSpeak readings, so very short runs can be rounded.
        Records come from the ThingSpeak history and are also remembered on this device.
      </p>
    </div>
  );
}
