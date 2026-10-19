import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Droplets } from "lucide-react";
import { CFG } from "@/lib/irrigation";
import { useSystem, zoneOf, type Zone } from "@/lib/system";
import { ago, dailyTotals, dayKey, fmtDur, fmtLiters } from "@/lib/records";
import { Card, Metric, PageHeader, Pill, SectionTitle, Stat, Toggle } from "@/components/ui";

const ZONE_COLOR: Record<Zone, string> = { dry: "#e07a86", optimal: "#4cbf78", wet: "#38a9e0" };
const ZONE_TEXT: Record<Zone, string> = {
  dry: `Dry — below ${CFG.lowThreshold}%`,
  optimal: "Optimal",
  wet: `Wet — above ${CFG.highThreshold}%`,
};

/* ---------- semicircle gauge ---------- */
const CX = 100, CY = 100, R = 78;
function pt(v: number, r = R) {
  const a = Math.PI * (1 - v / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}
function arc(v0: number, v1: number) {
  if (v1 - v0 <= 0) return "";
  const p0 = pt(v0), p1 = pt(v1);
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${R} ${R} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

function Gauge({ title, pct, stamp }: { title: string; pct: number | null; stamp: string }) {
  const zone = pct == null ? null : zoneOf(pct);
  const v = pct == null ? 0 : Math.min(100, Math.max(0, pct));
  const color = zone ? ZONE_COLOR[zone] : "#6d8e94";
  const tick = (x: number) => {
    const a = pt(x, R - 12), b = pt(x, R + 12);
    return <line key={x} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e7f4f1" strokeWidth="1.5" opacity="0.8" />;
  };
  return (
    <article className="min-w-0 rounded-card border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-muted">
        <span className="truncate">{title}</span>
        <span className="shrink-0 text-xs text-faint">{stamp}</span>
      </div>
      <svg viewBox="0 0 200 118" className="mx-auto mt-2 w-full max-w-[18rem]" role="img"
        aria-label={`${title} soil moisture ${pct == null ? "no data" : pct + " percent"}`}>
        <path d={arc(0, CFG.lowThreshold)} fill="none" stroke={ZONE_COLOR.dry} strokeWidth="14" opacity="0.25" />
        <path d={arc(CFG.lowThreshold, CFG.highThreshold)} fill="none" stroke={ZONE_COLOR.optimal} strokeWidth="14" opacity="0.25" />
        <path d={arc(CFG.highThreshold, 100)} fill="none" stroke={ZONE_COLOR.wet} strokeWidth="14" opacity="0.25" />
        {pct != null && <path d={arc(0, v)} fill="none" stroke={color} strokeWidth="14" />}
        {tick(CFG.lowThreshold)}
        {tick(CFG.highThreshold)}
        <text x={CX} y={CY - 12} textAnchor="middle" fontSize="30" fontWeight="800" fill="#e7f4f1">
          {pct == null ? "--%" : `${pct}%`}
        </text>
        <text x={pt(0).x} y="116" textAnchor="middle" fontSize="9" fill="#8eafb4">0</text>
        <text x={pt(100).x} y="116" textAnchor="middle" fontSize="9" fill="#8eafb4">100</text>
      </svg>
      <p className="mt-1 text-center">
        <span
          className="inline-flex rounded-full px-3 py-1 text-sm font-bold"
          style={{ background: `${color}33`, color }}
        >
          {zone ? ZONE_TEXT[zone] : "No data"}
        </span>
      </p>
    </article>
  );
}

const RANGES = [
  { id: "1h", label: "1h", ms: 60 * 60 * 1000 },
  { id: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

function HistoryChart({ range }: { range: RangeId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { feeds, now } = useSystem();

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, r.width * dpr);
    c.height = Math.max(1, r.height * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, H = r.height, L = 34, Rt = 8, T = 8, B = 22;
    const pw = W - L - Rt, ph = H - T - B;
    const span = RANGES.find((x) => x.id === range)!.ms;
    const end = now;
    const start = end - span;
    const data = feeds.filter((f) => f.t >= start && f.t <= end);
    const y = (v: number) => T + ph * (1 - v / 100);
    const x = (t: number) => L + (pw * (t - start)) / span;
    g.font = "11px Manrope, sans-serif";
    g.textBaseline = "middle";
    [0, 25, 50, 75, 100].forEach((v) => {
      g.strokeStyle = "rgba(231,244,241,.12)";
      g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - Rt, y(v)); g.stroke();
      g.fillStyle = "rgba(142,175,180,.9)";
      g.textAlign = "right";
      g.fillText(String(v), L - 6, y(v));
    });
    const pumpOn = (f: (typeof data)[number]) => (f.pump != null ? f.pump > 0 : (f.flow ?? 0) > 0);
    for (let i = 0; i < data.length; i++) {
      if (!pumpOn(data[i])) continue;
      const x0 = x(data[i].t);
      const x1 = i + 1 < data.length ? x(data[i + 1].t) : Math.min(W - Rt, x0 + 6);
      g.fillStyle = "rgba(60,154,98,.28)";
      g.fillRect(x0, T, Math.max(2, x1 - x0), ph);
    }
    g.setLineDash([5, 5]);
    g.strokeStyle = "rgba(224,177,90,.8)";
    [CFG.lowThreshold, CFG.highThreshold].forEach((v) => {
      g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - Rt, y(v)); g.stroke();
    });
    g.setLineDash([]);
    if (data.length < 2) {
      g.fillStyle = "rgba(142,175,180,.9)";
      g.textAlign = "center";
      g.fillText("Waiting for data in this range...", W / 2, H / 2);
      return;
    }
    ([["b1", "#3c9a62"], ["b2", "#1f7a96"]] as const).forEach(([k, col]) => {
      g.beginPath();
      let pen = false;
      data.forEach((d) => {
        const val = d[k];
        if (val == null) { pen = false; return; }
        if (pen) g.lineTo(x(d.t), y(val)); else g.moveTo(x(d.t), y(val));
        pen = true;
      });
      g.strokeStyle = col;
      g.lineWidth = 2.5;
      g.lineJoin = "round";
      g.stroke();
    });
    const tm = (t: number) => span > 24 * 60 * 60 * 1000
      ? new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      : new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    g.fillStyle = "rgba(142,175,180,.9)";
    g.textBaseline = "top";
    g.textAlign = "left";
    g.fillText(tm(start), L, H - B + 6);
    g.textAlign = "right";
    g.fillText(tm(end), W - Rt, H - B + 6);
  }, [feeds, range, now]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return <canvas ref={canvasRef} className="h-64 w-full" aria-label="Moisture history chart" />;
}

/* ---------- page ---------- */
export function Overview() {
  const s = useSystem();
  const [range, setRange] = useState<RangeId>("6h");

  const statusDot = s.status === "online" ? "bg-ok" : s.status === "offline" ? "bg-bad" : "bg-warn";
  const statusText =
    s.status === "online" ? "Online" : s.status === "stale" ? "Stale data" : s.status === "offline" ? "Offline" : "Connecting";
  const stamp = ago(s.lastUpdate, s.now);

  const today = useMemo(() => {
    const key = dayKey(s.now);
    return dailyTotals(s.ops).find((d) => d.day === key) ?? { day: key, count: 0, liters: 0, seconds: 0 };
  }, [s.ops, s.now]);
  const lastFert = s.fert[0];
  const alerts = useMemo(() => {
    const items: { level: "alert" | "warn" | "info"; title: string; detail: string }[] = [];
    if (s.status === "offline") items.push({ level: "alert", title: "Data connection offline", detail: "Live readings are unavailable. Check the ESP32 network or ThingSpeak connection." });
    else if (s.status === "stale") items.push({ level: "warn", title: "Readings may be stale", detail: "The last sensor update is older than expected." });
    if (s.b1 == null) items.push({ level: "warn", title: "Bed 1 sensor has no reading", detail: "No valid moisture value is currently available." });
    else if (s.b1 < CFG.lowThreshold) items.push({ level: "warn", title: "Bed 1 moisture is low", detail: `${s.b1}% moisture · below the ${CFG.lowThreshold}% configured threshold.` });
    else if (s.b1 > CFG.highThreshold) items.push({ level: "info", title: "Bed 1 moisture is high", detail: `${s.b1}% moisture · above the ${CFG.highThreshold}% upper threshold.` });
    if (s.b2 == null) items.push({ level: "warn", title: "Bed 2 sensor has no reading", detail: "No valid moisture value is currently available." });
    else if (s.b2 < CFG.lowThreshold) items.push({ level: "warn", title: "Bed 2 moisture is low", detail: `${s.b2}% moisture · below the ${CFG.lowThreshold}% configured threshold.` });
    else if (s.b2 > CFG.highThreshold) items.push({ level: "info", title: "Bed 2 moisture is high", detail: `${s.b2}% moisture · above the ${CFG.highThreshold}% upper threshold.` });
    if (s.status === "online" && s.pump && s.flow <= 0) items.push({ level: "warn", title: "Pump on, but no flow reported", detail: "Confirm the flow sensor and water line. This is an indicator, not a confirmed hardware fault." });
    if (!items.length) items.push({ level: "info", title: "All checks look good", detail: "No connection or moisture warnings detected from the latest available readings." });
    return items;
  }, [s.status, s.b1, s.b2, s.pump, s.flow]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Overview" sub={`Welcome back, ${s.account.name}. Here's your irrigation system at a glance.`} />
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#174b45] via-[#123b43] to-[#102a35] p-5 shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-1 -top-9 h-36 w-36 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-200">Smart irrigation • Live monitoring</p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Grow smarter with Aqua-Grow.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Monitor soil moisture, water use, equipment status, and garden activity from one workspace.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">System status</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-extrabold"><span className={`h-2.5 w-2.5 rounded-full ${statusDot} ${s.status === "online" ? "animate-pulse" : ""}`} />{statusText}</p>
            <p className="mt-1 text-xs text-white/60">Updated {stamp}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-sm font-semibold">
        <Pill dot={statusDot} label="System" value={statusText} />
        <Pill dot="bg-faint" label="Source" value={s.source} />
        <Pill dot="bg-faint" label="Last update" value={stamp} />
        {s.mode && <Pill dot="bg-leaf" label="Mode" value={s.mode} />}
        <Pill dot={s.pump ? "bg-ok" : "bg-faint"} label="Pump" value={s.pump ? "On" : "Off"} />
        <Pill dot={s.flow > 0 ? "bg-ok" : "bg-faint"} label="Flow" value={`${s.flow.toFixed(1)} L/min`} />
      </div>

      <SectionTitle>Soil moisture</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <Gauge title="Planter bed 1" pct={s.b1} stamp={stamp} />
        <Gauge title="Planter bed 2" pct={s.b2} stamp={stamp} />
      </div>

      <SectionTitle>Garden system layout</SectionTitle>
      <Card className="overflow-hidden p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="font-bold">Two-bed irrigation map</h3><p className="text-xs text-muted">Live indicators reflect the latest readings and commanded equipment state.</p></div>
          <span className="rounded-full border border-line px-3 py-1 text-xs font-bold text-muted">{s.pump ? "Water system active" : "Water system idle"}</span>
        </div>
        <div className="overflow-x-auto rounded-2xl bg-[#0b252c] p-2 sm:p-4">
          <svg viewBox="0 0 760 300" role="img" aria-label="Aqua-Grow two-bed irrigation layout showing pump, main pipe, two valves, sprinklers, and moisture sensors" className="mx-auto w-full min-w-[560px] max-w-4xl">
            <defs><linearGradient id="bedGreen" x1="0" x2="1"><stop offset="0%" stopColor="#174b3b"/><stop offset="100%" stopColor="#216747"/></linearGradient><linearGradient id="pipeBlue" x1="0" x2="1"><stop offset="0%" stopColor="#267a91"/><stop offset="100%" stopColor="#4bc6df"/></linearGradient></defs>
            <path d="M110 154 H650" stroke="url(#pipeBlue)" strokeWidth="8" strokeLinecap="round" opacity={s.pump ? 1 : .45}/>
            <path d="M230 154 V91 H300 M470 154 V91 H540" stroke="url(#pipeBlue)" strokeWidth="6" fill="none" strokeLinecap="round" opacity={(s.v1 || s.v2) ? 1 : .45}/>
            <rect x="20" y="117" width="92" height="74" rx="16" fill="#163f4a" stroke="#4bc6df" strokeWidth="2"/><path d="M48 151 Q66 127 84 151 Q66 175 48 151Z" fill="#4bc6df"/><text x="66" y="208" fill="#e7f4f1" textAnchor="middle" fontSize="13" fontWeight="700">Pump</text><text x="66" y="226" fill={s.pump ? "#4cbf78" : "#8eafb4"} textAnchor="middle" fontSize="12">{s.pump ? "ON" : "OFF"}</text>
            <rect x="300" y="28" width="150" height="108" rx="16" fill="url(#bedGreen)" stroke={s.b1 == null ? "#6d8e94" : s.b1 < CFG.lowThreshold ? "#e0b15a" : s.b1 > CFG.highThreshold ? "#38a9e0" : "#4cbf78"} strokeWidth="2"/><text x="375" y="52" fill="#e7f4f1" textAnchor="middle" fontSize="15" fontWeight="800">Bed 1</text><text x="375" y="79" fill="#ffffff" textAnchor="middle" fontSize="24" fontWeight="800">{s.b1 == null ? "--%" : `${s.b1}%`}</text><text x="375" y="100" fill="#d1f5df" textAnchor="middle" fontSize="11">Moisture sensor</text><circle cx="375" cy="119" r="5" fill={s.v1 ? "#4cbf78" : "#8eafb4"}/>
            <rect x="460" y="180" width="150" height="102" rx="16" fill="url(#bedGreen)" stroke={s.b2 == null ? "#6d8e94" : s.b2 < CFG.lowThreshold ? "#e0b15a" : s.b2 > CFG.highThreshold ? "#38a9e0" : "#4cbf78"} strokeWidth="2"/><text x="535" y="205" fill="#e7f4f1" textAnchor="middle" fontSize="15" fontWeight="800">Bed 2</text><text x="535" y="232" fill="#ffffff" textAnchor="middle" fontSize="24" fontWeight="800">{s.b2 == null ? "--%" : `${s.b2}%`}</text><text x="535" y="252" fill="#d1f5df" textAnchor="middle" fontSize="11">Moisture sensor</text><circle cx="535" cy="266" r="5" fill={s.v2 ? "#4cbf78" : "#8eafb4"}/>
            <rect x="196" y="139" width="68" height="30" rx="8" fill={s.v1 ? "#2d7a4c" : "#17424c"} stroke="#4bc6df"/><text x="230" y="158" fill="#e7f4f1" textAnchor="middle" fontSize="11" fontWeight="700">Valve 1</text><rect x="436" y="139" width="68" height="30" rx="8" fill={s.v2 ? "#2d7a4c" : "#17424c"} stroke="#4bc6df"/><text x="470" y="158" fill="#e7f4f1" textAnchor="middle" fontSize="11" fontWeight="700">Valve 2</text>
            {[330,375,420].map(x => <g key={`spr1-${x}`}><path d={`M${x} 92 v-13 m-7 0 q7 -10 14 0`} stroke="#b7f3ff" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx={x} cy="75" r="2" fill="#4bc6df"/></g>)}
            {[490,535,580].map(x => <g key={`spr2-${x}`}><path d={`M${x} 246 v-13 m-7 0 q7 -10 14 0`} stroke="#b7f3ff" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx={x} cy="229" r="2" fill="#4bc6df"/></g>)}
            <text x="650" y="143" fill="#8eafb4" fontSize="11">Main line</text><text x="650" y="160" fill={s.pump ? "#4cbf78" : "#8eafb4"} fontSize="11">{s.pump ? "Flow active" : "No flow"}</text>
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-ok"/>Optimal moisture</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-warn"/>Below threshold</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#38a9e0]"/>Above upper threshold</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-faint"/>No reading / inactive</span></div>
      </Card>

      <SectionTitle>System health & alerts</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {alerts.map((a, i) => <div key={`${a.title}-${i}`} className={`flex gap-3 rounded-2xl border p-4 ${a.level === "alert" ? "border-bad/40 bg-bad/10" : a.level === "warn" ? "border-warn/40 bg-warn/10" : "border-line bg-surface"}`}><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.level === "alert" ? "bg-bad" : a.level === "warn" ? "bg-warn" : "bg-ok"}`}/><div><p className="text-sm font-extrabold">{a.title}</p><p className="mt-1 text-xs leading-5 text-muted">{a.detail}</p></div></div>)}
      </div>

      <SectionTitle>Today</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Watering operations" value={String(today.count)} sub="Pump runs recorded today" />
        <Metric label="Water used" value={`${fmtLiters(today.liters)} L`} sub="Total for today" />
        <Metric label="Pump run time" value={fmtDur(today.seconds)} sub="Total for today" />
        <Metric
          label="Last fertigation"
          value={lastFert ? lastFert.fertilizer : "None yet"}
          sub={lastFert ? `${lastFert.bed} · ${ago(lastFert.ts, s.now)}` : "Add one in the Fertigation page"}
        />
      </div>

      <SectionTitle>{s.readOnly ? "Live equipment status" : "Controls"}</SectionTitle>
      {s.readOnly && <p className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">View-only account: you can monitor readings and equipment status, but cannot operate valves or change the system.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold">Valves</h3>
            <span className="truncate text-xs text-faint">{s.ctl}</span>
          </div>
          {s.readOnly ? (
            <div className="space-y-3 text-sm"><p className="flex items-center justify-between"><span>Valve 1 · Bed 1</span><strong>{s.v1 ? "ON" : "OFF"}</strong></p><p className="flex items-center justify-between"><span>Valve 2 · Bed 2</span><strong>{s.v2 ? "ON" : "OFF"}</strong></p></div>
          ) : (
            <><Toggle label="Valve 1" sub="Bed 1 line" on={s.v1} onChange={(on) => void s.onValve(1, on)} /><Toggle label="Valve 2" sub="Bed 2 line" on={s.v2} onChange={(on) => void s.onValve(2, on)} /></>
          )}
          <p className="mt-3 text-xs text-faint">
            One valve at a time. Manual and fertigation switches on the panel override the website. The pump follows the open valve.
          </p>
        </Card>
        <Stat title="Water pump" big={s.pump ? "On" : "Off"} sub="Pump state" on={s.pump} icon={<Droplets size={18} />} />
        <Stat title="Flow meter" big={s.flow.toFixed(1)} sub="Liters per minute" on={s.flow > 0} />
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-muted">Moisture history</h2>
        <div className="flex rounded-full border border-line bg-sidebar p-1" role="group" aria-label="History range">
          {RANGES.map((n) => (
            <button
              key={n.id}
              onClick={() => setRange(n.id)}
              className={`rounded-full px-3 py-1 text-sm font-bold ${range === n.id ? "bg-surface-2 text-ink" : "text-muted"}`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>
      <Card className="p-4">
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 rounded-sm bg-leaf" /> Bed 1</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 rounded-sm bg-drop" /> Bed 2</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-0.5 w-3 bg-warn" /> {CFG.lowThreshold}% / {CFG.highThreshold}% limits</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-3 rounded-sm bg-leaf/40" /> Pump running</span>
          <span className="text-faint">{range} window</span>
        </div>
        <HistoryChart range={range} />
      </Card>
    </div>
  );
}
