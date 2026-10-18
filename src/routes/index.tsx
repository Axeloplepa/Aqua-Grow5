import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Droplets, LayoutDashboard, LogOut, Users } from "lucide-react";
import { CFG, num, passwordHash, type Account } from "@/lib/irrigation";

export const Route = createFileRoute("/")({ component: Home });

type Phase = "splash" | "login" | "app";
type Page = "dashboard" | "researchers";
type Hist = { t: number; b1: number | null; b2: number | null };
type Ev = { t: string; msg: string; kind: "" | "i" | "w" | "d" };

function Home() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [page, setPage] = useState<Page>("dashboard");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [authErr, setAuthErr] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("login"), 2400);
    return () => window.clearTimeout(t);
  }, []);

  function signOut() {
    setAccount(null);
    setPage("dashboard");
    setPhase("login");
    setPass("");
    setAuthMsg("");
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    const u = user.trim().toLowerCase();
    const acc = CFG.users.find((x) => x.user === u);
    const hash = await passwordHash(u, pass);
    if (!acc || acc.hash !== hash) {
      setAuthErr(true);
      setAuthMsg("Wrong username or password.");
      return;
    }
    setAuthErr(false);
    setAuthMsg("");
    setPass("");
    setAccount(acc);
    setPhase("app");
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {phase === "splash" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-6">
          <img src="/logo.png" alt="Aqua-Grow" className="anim-logo aspect-square w-full max-w-xs rounded-full object-cover" />
          <p className="anim-up text-sm font-bold tracking-[0.2em] text-muted">IRRIGATION AND FERTIGATION</p>
        </div>
      )}

      {phase === "login" && (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
          <form onSubmit={onLogin} className="anim-up w-full max-w-sm rounded-card border border-line bg-surface p-7">
            <img src="/logo.png" alt="Aqua-Grow" className="mx-auto mb-5 h-28 w-28 rounded-full object-cover" />
            <h1 className="text-xl font-extrabold tracking-tight">Log in</h1>
            <p className="mt-1 text-sm text-muted">Sign in to open the irrigation dashboard.</p>
            <label className="mt-5 block text-sm font-semibold text-muted" htmlFor="user">Username</label>
            <input
              id="user"
              autoCapitalize="none"
              autoComplete="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-sidebar px-3 py-3 text-ink outline-none focus:border-leaf"
            />
            <label className="mt-4 block text-sm font-semibold text-muted" htmlFor="pass">Password</label>
            <input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-sidebar px-3 py-3 text-ink outline-none focus:border-leaf"
            />
            <button type="submit" className="mt-5 w-full rounded-xl bg-leaf px-4 py-3 font-bold text-sidebar hover:bg-leaf-2">
              Log in
            </button>
            <p className={`mt-3 min-h-5 text-sm ${authErr ? "text-bad" : "text-muted"}`}>{authMsg}</p>
          </form>
        </div>
      )}

      {phase === "app" && account && (
        <Shell
          account={account}
          page={page}
          navOpen={navOpen}
          onNav={(p) => { setPage(p); setNavOpen(false); }}
          onToggle={() => setNavOpen((v) => !v)}
          onLogout={signOut}
        />
      )}
    </div>
  );
}

function Shell({
  account, page, navOpen, onNav, onToggle, onLogout,
}: {
  account: Account;
  page: Page;
  navOpen: boolean;
  onNav: (p: Page) => void;
  onToggle: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen">
      {navOpen && (
        <button aria-label="Close menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-line bg-sidebar px-3 py-4 transition-transform lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center gap-3 px-2">
          <img src="/logo.png" alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          <div>
            <p className="text-sm font-extrabold tracking-wide">AQUA-GROW</p>
            <p className="text-xs text-faint">Irrigation & fertigation</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavBtn active={page === "dashboard"} onClick={() => onNav("dashboard")} icon={<LayoutDashboard size={18} />}>
            Dashboard
          </NavBtn>
          <NavBtn active={page === "researchers"} onClick={() => onNav("researchers")} icon={<Users size={18} />}>
            Researchers
          </NavBtn>
        </nav>
        <div className="mt-4 border-t border-line pt-3">
          <p className="px-3 pb-2 text-xs text-faint">{account.name}</p>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-ink hover:bg-surface"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-sidebar px-4 py-3 lg:hidden">
          <button onClick={onToggle} className="rounded-lg border border-line px-3 py-2 text-sm font-bold">Menu</button>
          <span className="font-extrabold">AQUA-GROW</span>
        </header>
        <main className="flex-1 px-4 py-5 lg:px-8">
          {page === "dashboard" ? <Dashboard account={account} /> : <Researchers />}
        </main>
      </div>
    </div>
  );
}

function NavBtn({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${
        active ? "bg-leaf text-sidebar" : "text-ink hover:bg-surface"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

const RESEARCHERS = [
  "Amongo, Jessa Mae D.",
  "Apelo, Pauline R.",
  "Caldeo, Axle Russ F.",
  "Clavaton, Ricky John A.",
  "Dalumpines, Mary Ellaine Joy C.",
  "Navarro, Lea May D.",
];

function Researchers() {
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Researchers</h1>
      <p className="mt-1 text-sm text-muted">Group 5 — Roxas City School for Philippine Craftsmen</p>
      <img src="/researchers.jpg" alt="Group 5 researchers" className="mt-5 w-full rounded-card border border-line" />
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {RESEARCHERS.map((name) => (
          <li key={name} className="rounded-card border border-line bg-surface px-4 py-3 font-bold">
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dashboard({ account }: { account: Account }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hist = useRef<Hist[]>([]);
  const rangeN = useRef(60);
  const lastKey = useRef("");
  const dry = useRef<[boolean | null, boolean | null]>([null, null]);
  const prev = useRef<[boolean, boolean]>([false, false]);
  const holdUntil = useRef(0);
  const idle = useRef<number | null>(null);

  const [range, setRange] = useState(60);
  const [b1, setB1] = useState<number | null>(null);
  const [b2, setB2] = useState<number | null>(null);
  const [age, setAge] = useState("");
  const [flow, setFlow] = useState(0);
  const [pump, setPump] = useState(false);
  const [link, setLink] = useState("Connecting");
  const [linkKind, setLinkKind] = useState<"ok" | "warn" | "bad">("warn");
  const [v1, setV1] = useState(false);
  const [v2, setV2] = useState(false);
  const [ctl, setCtl] = useState("Ready");
  const [events, setEvents] = useState<Ev[]>([]);

  const log = useCallback((msg: string, kind: Ev["kind"] = "") => {
    const t = new Date().toLocaleTimeString("en-GB");
    setEvents((xs) => [{ t, msg, kind }, ...xs].slice(0, 50));
  }, []);

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
    const W = r.width, H = r.height, L = 34, R = 8, T = 8, B = 22;
    const pw = W - L - R, ph = H - T - B;
    const data = hist.current.slice(-rangeN.current);
    const y = (v: number) => T + ph * (1 - v / 100);
    g.font = "11px Manrope, sans-serif";
    g.textBaseline = "middle";
    [0, 25, 50, 75, 100].forEach((v) => {
      g.strokeStyle = "rgba(231,244,241,.12)";
      g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - R, y(v)); g.stroke();
      g.fillStyle = "rgba(142,175,180,.9)";
      g.textAlign = "right";
      g.fillText(String(v), L - 6, y(v));
    });
    g.setLineDash([5, 5]);
    g.strokeStyle = "rgba(224,177,90,.8)";
    g.beginPath();
    g.moveTo(L, y(CFG.threshold));
    g.lineTo(W - R, y(CFG.threshold));
    g.stroke();
    g.setLineDash([]);
    if (data.length < 2) {
      g.fillStyle = "rgba(142,175,180,.9)";
      g.textAlign = "center";
      g.fillText("Waiting for data...", W / 2, H / 2);
      return;
    }
    const x = (i: number) => L + (pw * i) / (data.length - 1);
    ([["b1", "#3c9a62"], ["b2", "#1f7a96"]] as const).forEach(([k, col]) => {
      g.beginPath();
      let pen = false;
      data.forEach((d, i) => {
        const val = d[k];
        if (val == null) { pen = false; return; }
        pen ? g.lineTo(x(i), y(val)) : g.moveTo(x(i), y(val));
        pen = true;
      });
      g.strokeStyle = col;
      g.lineWidth = 2.5;
      g.lineJoin = "round";
      g.stroke();
    });
    const tm = (d: Hist) => new Date(d.t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    g.fillStyle = "rgba(142,175,180,.9)";
    g.textBaseline = "top";
    g.textAlign = "left";
    g.fillText(tm(data[0]), L, H - B + 6);
    g.textAlign = "right";
    g.fillText(tm(data[data.length - 1]), W - R, H - B + 6);
  }, []);

  const applyBed = useCallback((i: 0 | 1, pct: number | null) => {
    if (pct == null) return;
    if (i === 0) setB1(pct); else setB2(pct);
    const isDry = pct < CFG.threshold;
    if (dry.current[i] !== null && dry.current[i] !== isDry) {
      log(`Bed ${i + 1} is now ${isDry ? "dry" : "moist"} (${pct}%)`, isDry ? "d" : "i");
    }
    dry.current[i] = isDry;
  }, [log]);

  const loadLive = useCallback(async (full: boolean) => {
    const url = `https://api.thingspeak.com/channels/${CFG.dataChannel}/feeds.json?api_key=${CFG.dataReadKey}&results=${full ? 200 : 1}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const js = await res.json();
      const feeds = js.feeds || [];
      const F = CFG.F;
      if (full) {
        hist.current = feeds.map((f: Record<string, string>) => ({
          t: new Date(f.created_at).getTime(),
          b1: num(f["field" + F.moist1]),
          b2: num(f["field" + F.moist2]),
        }));
      }
      const f = feeds[feeds.length - 1];
      if (!f) { log("No data in channel yet", "w"); return; }
      const mb1 = num(f["field" + F.moist1]);
      const mb2 = num(f["field" + F.moist2]);
      applyBed(0, mb1);
      applyBed(1, mb2);
      const fl = num(f["field" + F.flow]);
      const pm = num(f["field" + F.pump]);
      if (fl != null) setFlow(fl);
      if (pm != null) setPump(pm > 0);
      else if (fl != null) setPump(fl > 0);
      const secs = Math.round((Date.now() - new Date(f.created_at).getTime()) / 1000);
      setAge(secs < 90 ? `${secs}s ago` : `${Math.round(secs / 60)} min ago`);
      const stale = secs > 120;
      setLink(stale ? "Stale" : "Live");
      setLinkKind(stale ? "warn" : "ok");
      const key = String(f.entry_id);
      if (!full && key !== lastKey.current) {
        hist.current.push({ t: new Date(f.created_at).getTime(), b1: mb1, b2: mb2 });
        log(`Live update: Bed 1 ${mb1}% | Bed 2 ${mb2}%`, "i");
      }
      lastKey.current = key;
      draw();
    } catch (e) {
      setLink("Offline");
      setLinkKind("bad");
      log("Could not read ThingSpeak: " + (e instanceof Error ? e.message : "error"), "d");
    }
  }, [applyBed, draw, log]);

  const syncLocal = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 1800);
      let res: Response;
      try {
        res = await fetch(`${CFG.localBase}/status`, { cache: "no-store", signal: controller.signal });
      } finally { window.clearTimeout(timer); }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      if (j.bed1 >= 0) applyBed(0, num(j.bed1));
      if (j.bed2 >= 0) applyBed(1, num(j.bed2));
      if (j.flow != null) setFlow(Number(j.flow));
      setPump(Number(j.pump) === 1);
      if (Date.now() >= holdUntil.current) {
        const a = Number(j.v1) === 1;
        const b = Number(j.v2) === 1;
        setV1(a); setV2(b);
        prev.current = [a, b];
      }
      setLink("ESP32 Local");
      setLinkKind("ok");
      setCtl(j.fault ? "FLOW FAULT — pump stopped" : "Direct local control");
      return true;
    } catch {
      return false;
    }
  }, [applyBed]);

  useEffect(() => {
    log("ThingSpeak history on. Trying ESP32 at " + CFG.localBase, "i");
    log(`${account.name} logged in`, "i");
    void loadLive(true);
    void syncLocal();
    const id = window.setInterval(() => {
      void loadLive(false);
      if (CFG.preferLocalControl) void syncLocal();
    }, CFG.pollMs);
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", onResize);
    };
  }, [account.name, draw, loadLive, log, syncLocal]);

  useEffect(() => { draw(); }, [range, draw, b1, b2]);

  function bumpIdle() {
    if (idle.current) window.clearTimeout(idle.current);
  }

  async function onValve(which: 1 | 2, next: boolean) {
    let a = which === 1 ? next : v1;
    let b = which === 2 ? next : v2;
    if (which === 1 && next) b = false;
    if (which === 2 && next) a = false;
    setV1(a); setV2(b);
    prev.current = [a, b];
    holdUntil.current = Date.now() + 2500;
    setCtl("Sending command…");
    const pumpFlag = a || b ? 1 : 0;
    try {
      if (CFG.preferLocalControl) {
        try {
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 1800);
          let res: Response;
          try {
            res = await fetch(`${CFG.localBase}/cmd?v1=${a ? 1 : 0}&v2=${b ? 1 : 0}`, { cache: "no-store", signal: controller.signal });
          } finally { window.clearTimeout(timer); }
          if (!res.ok) throw new Error("HTTP " + res.status);
          const reply = await res.json();
          if (!reply.ok) throw new Error(reply.reason || "ESP32 rejected the command");
          log(!a && !b
            ? "Local STOP sent. Physical Manual/Fertigation switches still have priority."
            : `Local command sent: Valve ${a ? "1" : "2"} ${a || b ? "ON" : "OFF"}.`, "i");
          setCtl("Sent to ESP32");
          await syncLocal();
          return;
        } catch (err) {
          log("Local IP unavailable: " + (err instanceof Error ? err.message : "error"), "w");
          log("Trying ThingSpeak fallback (~15 s).", "i");
        }
      }
      const url = `https://api.thingspeak.com/update?api_key=${CFG.ctlWriteKey}`
        + `&field${CFG.ctlFields.pump}=${pumpFlag}`
        + `&field${CFG.ctlFields.valve1}=${a ? 1 : 0}`
        + `&field${CFG.ctlFields.valve2}=${b ? 1 : 0}`;
      const id = await (await fetch(url)).text();
      if (id.trim() === "0") {
        log("ThingSpeak rate limit (1 write / 15 s). Try again in a few seconds.", "w");
        setCtl("Rate limited – retry soon");
      } else {
        log(!a && !b
          ? "Remote STOP sent through ThingSpeak."
          : `ThingSpeak command queued: Valve ${a ? "1" : "2"} OPEN. ESP32 applies it on its next poll (~15 s).`, "i");
        setCtl("Queued via ThingSpeak");
      }
    } catch (e) {
      setV1(prev.current[0]);
      setV2(prev.current[1]);
      log("Valve command failed: " + (e instanceof Error ? e.message : "error"), "d");
      setCtl("Error");
    }
  }

  const linkColor = linkKind === "ok" ? "bg-ok" : linkKind === "bad" ? "bg-bad" : "bg-warn";

  return (
    <div className="mx-auto max-w-6xl" onPointerDown={bumpIdle}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Signed in as {account.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <Pill dot={pump ? "bg-ok" : "bg-faint"} label="Pump" value={pump ? "On" : "Off"} />
          <Pill dot={flow > 0 ? "bg-ok" : "bg-faint"} label="Flow" value={`${flow.toFixed(1)} L/min`} />
          <Pill dot={linkColor} label="Link" value={link} />
        </div>
      </div>

      <h2 className="mb-3 text-sm font-bold text-muted">Soil moisture</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <BedCard title="Planter bed 1" pct={b1} age={age} accent="bg-leaf" />
        <BedCard title="Planter bed 2" pct={b2} age={age} accent="bg-drop" />
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted">History</h2>
        <div className="flex rounded-full border border-line bg-sidebar p-1">
          {[30, 60, 120].map((n) => (
            <button
              key={n}
              onClick={() => { rangeN.current = n; setRange(n); void loadLive(true); }}
              className={`rounded-full px-3 py-1 text-sm font-bold ${range === n ? "bg-surface-2 text-ink" : "text-muted"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 rounded-sm bg-leaf" /> Bed 1</span>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 rounded-sm bg-drop" /> Bed 2</span>
        </div>
        <canvas ref={canvasRef} className="h-64 w-full" aria-label="Moisture history chart" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="min-w-0 rounded-card border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Valves</h3>
            <span className="text-xs text-faint">{ctl}</span>
          </div>
          <Toggle label="Valve 1" sub="Bed 1 line" on={v1} onChange={(on) => void onValve(1, on)} />
          <Toggle label="Valve 2" sub="Bed 2 line" on={v2} onChange={(on) => void onValve(2, on)} />
          <p className="mt-3 text-xs text-faint">
            One valve at a time. Manual and fertigation switches on the panel override the website. The pump follows the open valve.
          </p>
        </section>
        <Stat title="Water pump" big={pump ? "On" : "Off"} sub="Pump state" on={pump} icon={<Droplets size={18} />} />
        <Stat title="Flow meter" big={flow.toFixed(1)} sub="Liters per minute" on={flow > 0} />
      </div>

      <h2 className="mt-6 mb-3 text-sm font-bold text-muted">Event log</h2>
      <div className="max-h-64 overflow-y-auto rounded-card border border-line bg-surface px-4 py-2">
        {events.length === 0 && <p className="py-6 text-center text-sm text-faint">No events yet</p>}
        {events.map((e, i) => (
          <div key={i} className="flex gap-3 border-b border-line py-2 text-sm last:border-0">
            <time className="w-16 shrink-0 text-faint">{e.t}</time>
            <span className={e.kind === "d" ? "text-bad" : e.kind === "w" ? "text-warn" : e.kind === "i" ? "text-leaf" : "text-muted"}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pill({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
      <i className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-faint">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function BedCard({ title, pct, age, accent }: { title: string; pct: number | null; age: string; accent: string }) {
  const dry = pct != null && pct < CFG.threshold;
  return (
    <article className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-center justify-between text-sm font-semibold text-muted">
        <span>{title}</span><span>{age}</span>
      </div>
      <p className="mt-2 text-5xl font-extrabold tracking-tight">{pct == null ? "--%" : `${pct}%`}</p>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${dry ? "bg-bad/20 text-bad" : "bg-ok/20 text-ok"}`}>
        {pct == null ? "--" : dry ? "Dry" : "Moist"}
      </span>
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-sidebar">
        <div className={`absolute inset-y-0 left-0 ${accent}`} style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-ink/70" style={{ left: `${CFG.threshold}%` }} />
      </div>
    </article>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        <span className="text-xs text-faint">{sub}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative inline-block h-8 w-14 shrink-0 overflow-hidden rounded-full border transition-colors ${
          on ? "border-leaf bg-leaf" : "border-line bg-sidebar"
        }`}
      >
        <span
          className={`absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-ink transition-transform ${
            on ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function Stat({ title, big, sub, on, icon }: { title: string; big: string; sub: string; on: boolean; icon?: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 text-center">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
        <span className="inline-flex items-center gap-2">{icon}{title}</span>
      </div>
      <i className={`mx-auto mb-2 block h-4 w-4 rounded-full ${on ? "bg-ok" : "bg-faint"}`} />
      <p className="text-4xl font-extrabold">{big}</p>
      <p className="text-sm text-faint">{sub}</p>
    </section>
  );
}
