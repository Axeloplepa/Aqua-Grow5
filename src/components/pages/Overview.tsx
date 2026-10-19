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


  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Overview" sub={`Welcome back, ${s.account.name}. Here's your irrigation system at a glance.`} />

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
          <svg viewBox="0 0 1000 560" role="img" aria-label="Aqua-Grow plumbing diagram: deep well and foot valve feed the pump, flow sensor and mainline; a Venturi fertilizer assembly connects to the fertilizer tank; solenoid valves supply Bed 1 and Bed 2 sprinkler lines." className="mx-auto w-full min-w-[680px] max-w-6xl">
            <defs>
              <linearGradient id="pipeFlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#258aa0"/><stop offset="100%" stopColor="#60d4e6"/></linearGradient>
              <linearGradient id="bedGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#174b3b"/><stop offset="100%" stopColor="#216747"/></linearGradient>
              <marker id="waterArrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#9cecf5"/></marker>
            </defs>
            {/* Main physical plumbing: deep well -> pump -> mainline -> both beds */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M78 315 V230 H125" stroke="#347e91" strokeWidth="8" opacity=".9"/>
              <path d="M183 230 H920" stroke={s.pump ? "url(#pipeFlow)" : "#28606d"} strokeWidth="9" opacity={s.pump ? 1 : .75}/>
              <path d="M450 230 V150 H530 M530 150 H560 V230" stroke={s.mode?.toLowerCase().includes("fert") ? "#e4b65b" : "#347e91"} strokeWidth="7" strokeDasharray={s.mode?.toLowerCase().includes("fert") ? "0" : "8 7"} opacity=".95"/>
              <path d="M740 230 V105 H785 M740 230 V410 H785" stroke={s.pump && (s.v1 || s.v2) ? "url(#pipeFlow)" : "#28606d"} strokeWidth="8" opacity={s.pump ? 1 : .8}/>
              <path d="M785 105 H945 M785 410 H945" stroke={s.pump && (s.v1 || s.v2) ? "url(#pipeFlow)" : "#28606d"} strokeWidth="8" markerEnd="url(#waterArrow)"/>
              {s.pump && <path d="M220 230 H415 M585 230 H710 M800 105 H900 M800 410 H900" stroke="#b6f4fb" strokeWidth="2.5" strokeDasharray="12 14" className="ag-water-flow"/>}
            </g>
            {/* Well and pump */}
            <rect x="28" y="315" width="105" height="105" rx="10" fill="#123d4a" stroke="#4bc6df" strokeWidth="2"/><path d="M30 340 Q48 330 65 340 T100 340 V418 H30Z" fill="#1e7184" opacity=".8"/><text x="80" y="385" fill="#e7f4f1" textAnchor="middle" fontSize="14" fontWeight="700">Deep well</text>
            <rect x="45" y="194" width="62" height="30" rx="6" fill="#173f4b" stroke="#7abac8"/><text x="76" y="213" fill="#e7f4f1" textAnchor="middle" fontSize="12" fontWeight="700">FV-1</text><text x="76" y="184" fill="#8eafb4" textAnchor="middle" fontSize="11">Foot valve</text>
            <circle cx="153" cy="230" r="31" fill="#164653" stroke="#4bc6df" strokeWidth="3"/><text x="153" y="237" fill="#e7f4f1" textAnchor="middle" fontSize="25" fontWeight="800">P</text><text x="153" y="278" fill="#e7f4f1" textAnchor="middle" fontSize="13" fontWeight="800">P-1 · 0.5 HP</text><text x="153" y="296" fill={s.pump ? "#4cbf78" : "#8eafb4"} textAnchor="middle" fontSize="12">Pump {s.pump ? "ON" : "OFF"}</text>
            <text x="95" y="305" fill="#8eafb4" fontSize="11">1 in suction</text>
            {/* Reducer and flow sensor */}
            <path d="M235 218 L260 230 L235 242 Z" fill="#b6dce4" stroke="#4bc6df" strokeWidth="1.5"/><text x="247" y="260" fill="#8eafb4" textAnchor="middle" fontSize="11">RD-1</text>
            <rect x="286" y="211" width="48" height="38" rx="18" fill="#173f4b" stroke="#4bc6df" strokeWidth="2"/><text x="310" y="235" fill="#e7f4f1" textAnchor="middle" fontSize="13" fontWeight="800">F</text><text x="310" y="270" fill="#8eafb4" textAnchor="middle" fontSize="11">FS-1</text><text x="310" y="284" fill="#8eafb4" textAnchor="middle" fontSize="10">Flow sensor</text>
            <rect x="365" y="212" width="58" height="36" rx="7" fill={s.v1 || s.v2 ? "#225f47" : "#173f4b"} stroke="#4bc6df"/><path d="M386 216 L402 230 L386 244 M402 216 L386 230 L402 244" stroke="#c6f6fb" strokeWidth="2" fill="none"/><text x="394" y="268" fill="#8eafb4" textAnchor="middle" fontSize="11">BV-1</text>
            <text x="505" y="254" fill="#8eafb4" textAnchor="middle" fontSize="11">1/2 in mainline</text>
            {/* Fertigation assembly */}
            <rect x="455" y="25" width="145" height="74" rx="9" fill="#173f4b" stroke="#e4b65b" strokeWidth="2"/><path d="M470 46 Q495 38 520 46 T585 46" fill="none" stroke="#e4b65b" strokeWidth="2"/><text x="527" y="68" fill="#f5e8c9" textAnchor="middle" fontSize="14" fontWeight="800">Fertilizer tank</text><text x="527" y="85" fill="#d4c29c" textAnchor="middle" fontSize="11">FT-1</text>
            <path d="M527 99 V150" stroke="#e4b65b" strokeWidth="4" strokeDasharray="7 6"/><rect x="493" y="118" width="68" height="24" rx="5" fill="#4c3e25" stroke="#e4b65b"/><text x="527" y="134" fill="#f5e8c9" textAnchor="middle" fontSize="11" fontWeight="700">INJ-1</text><text x="574" y="174" fill="#d4c29c" fontSize="10">Venturi</text>
            <rect x="430" y="132" width="35" height="25" rx="5" fill="#173f4b" stroke="#4bc6df"/><text x="447" y="148" fill="#e7f4f1" textAnchor="middle" fontSize="10" fontWeight="700">BV-2</text>
            <rect x="575" y="132" width="35" height="25" rx="5" fill="#173f4b" stroke="#4bc6df"/><text x="592" y="148" fill="#e7f4f1" textAnchor="middle" fontSize="10" fontWeight="700">BV-3</text>
            <rect x="635" y="211" width="58" height="38" rx="7" fill={s.mode?.toLowerCase().includes("fert") ? "#6b5122" : "#173f4b"} stroke={s.mode?.toLowerCase().includes("fert") ? "#e4b65b" : "#4bc6df"}/><path d="M650 216 L665 230 L650 244 M665 216 L650 230 L665 244" stroke="#c6f6fb" strokeWidth="2" fill="none"/><text x="664" y="268" fill="#8eafb4" textAnchor="middle" fontSize="11">BV-4</text>
            <text x="620" y="292" fill={s.mode?.toLowerCase().includes("fert") ? "#e4b65b" : "#8eafb4"} textAnchor="middle" fontSize="11">Fertigation {s.mode?.toLowerCase().includes("fert") ? "ACTIVE" : "standby"}</text>
            {/* Solenoid valves and beds */}
            <rect x="714" y="83" width="53" height="43" rx="7" fill={s.v1 ? "#225f47" : "#173f4b"} stroke={s.v1 ? "#4cbf78" : "#4bc6df"} strokeWidth="2"/><path d="M725 92 L741 105 L725 118 M741 92 L725 105 L741 118" stroke="#d8f6fb" strokeWidth="2" fill="none"/><text x="740" y="69" fill="#e7f4f1" textAnchor="middle" fontSize="12" fontWeight="800">SV-1</text><text x="740" y="143" fill={s.v1 ? "#4cbf78" : "#8eafb4"} textAnchor="middle" fontSize="11">{s.v1 ? "OPEN" : "CLOSED"}</text>
            <rect x="714" y="388" width="53" height="43" rx="7" fill={s.v2 ? "#225f47" : "#173f4b"} stroke={s.v2 ? "#4cbf78" : "#4bc6df"} strokeWidth="2"/><path d="M725 397 L741 410 L725 423 M741 397 L725 410 L741 423" stroke="#d8f6fb" strokeWidth="2" fill="none"/><text x="740" y="374" fill="#e7f4f1" textAnchor="middle" fontSize="12" fontWeight="800">SV-2</text><text x="740" y="448" fill={s.v2 ? "#4cbf78" : "#8eafb4"} textAnchor="middle" fontSize="11">{s.v2 ? "OPEN" : "CLOSED"}</text>
            <rect x="795" y="48" width="174" height="105" rx="10" fill="url(#bedGreen)" stroke={s.b1 == null ? "#6d8e94" : s.b1 < CFG.lowThreshold ? "#e0b15a" : s.b1 > CFG.highThreshold ? "#38a9e0" : "#4cbf78"} strokeWidth="2"/><text x="882" y="72" fill="#e7f4f1" textAnchor="middle" fontSize="15" fontWeight="800">Bed 1</text><text x="882" y="96" fill="#fff" textAnchor="middle" fontSize="23" fontWeight="800">{s.b1 == null ? "--%" : `${s.b1}%`}</text><text x="882" y="116" fill="#d1f5df" textAnchor="middle" fontSize="11">SP-1 · SP-2 · SP-3</text><text x="882" y="136" fill="#a6c8cc" textAnchor="middle" fontSize="10">2 moisture sensors</text>
            <rect x="795" y="358" width="174" height="105" rx="10" fill="url(#bedGreen)" stroke={s.b2 == null ? "#6d8e94" : s.b2 < CFG.lowThreshold ? "#e0b15a" : s.b2 > CFG.highThreshold ? "#38a9e0" : "#4cbf78"} strokeWidth="2"/><text x="882" y="382" fill="#e7f4f1" textAnchor="middle" fontSize="15" fontWeight="800">Bed 2</text><text x="882" y="406" fill="#fff" textAnchor="middle" fontSize="23" fontWeight="800">{s.b2 == null ? "--%" : `${s.b2}%`}</text><text x="882" y="426" fill="#d1f5df" textAnchor="middle" fontSize="11">SP-4 · SP-5 · SP-6</text><text x="882" y="446" fill="#a6c8cc" textAnchor="middle" fontSize="10">2 moisture sensors</text>
            <text x="28" y="472" fill="#8eafb4" fontSize="12">Pump: {s.pump ? "ON" : "OFF"} · Flow: {s.flow.toFixed(1)} L/min · System: {s.status}</text>
            <text x="28" y="493" fill="#8eafb4" fontSize="11">Valve indicators show commanded state; pipe glow indicates pump/valve command, not independent flow verification.</text>
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-ok"/>Optimal moisture</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-warn"/>Below threshold</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#38a9e0]"/>Above upper threshold</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-faint"/>No reading / inactive</span></div>
      </Card>



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
