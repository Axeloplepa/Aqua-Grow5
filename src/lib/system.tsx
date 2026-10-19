import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { CFG, num, type Account } from "@/lib/irrigation";
import { deriveOps, mergeOps, type Feed, type Op } from "@/lib/records";
import { loadJson, saveJson } from "@/lib/storage";

export type Level = "info" | "warn" | "alert";
export type EvCat = "System" | "Sensor" | "Valve" | "Pump" | "Link" | "Fertigation" | "Account";
export type Ev = { id: string; ts: number; cat: EvCat; level: Level; msg: string };
export type Fert = {
  id: string; ts: number; fertilizer: string; amount: string; bed: string; note: string; by: string;
};
export type Status = "connecting" | "online" | "stale" | "offline";
export type Zone = "dry" | "optimal" | "wet";

export const zoneOf = (pct: number): Zone =>
  pct < CFG.lowThreshold ? "dry" : pct > CFG.highThreshold ? "wet" : "optimal";

const EV_KEY = "aquagrow.events.v1";
const FERT_KEY = "aquagrow.fertigation.v1";
const OPS_KEY = "aquagrow.operations.v1";

type System = {
  account: Account;
  readOnly: boolean;
  now: number;
  b1: number | null;
  b2: number | null;
  flow: number;
  pump: boolean;
  v1: boolean;
  v2: boolean;
  ctl: string;
  status: Status;
  source: string;
  mode: string | null;
  lastUpdate: number | null;
  feeds: Feed[];
  feedsState: "loading" | "ok" | "error";
  ops: Op[];
  events: Ev[];
  fert: Fert[];
  log: (msg: string, level?: Level, cat?: EvCat) => void;
  clearEvents: () => void;
  addFert: (r: Omit<Fert, "id" | "by">) => void;
  removeFert: (id: string) => void;
  onValve: (which: 1 | 2, next: boolean) => Promise<void>;
  refresh: () => void;
};

const Ctx = createContext<System | null>(null);

export function useSystem() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSystem must be used inside SystemProvider");
  return c;
}

export function SystemProvider({ account, children }: { account: Account; children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [b1, setB1] = useState<number | null>(null);
  const [b2, setB2] = useState<number | null>(null);
  const [flow, setFlow] = useState(0);
  const [pump, setPump] = useState(false);
  const [v1, setV1] = useState(false);
  const [v2, setV2] = useState(false);
  const [ctl, setCtl] = useState("Ready");
  const [status, setStatus] = useState<Status>("connecting");
  const [source, setSource] = useState("--");
  const [mode, setMode] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [feedsState, setFeedsState] = useState<"loading" | "ok" | "error">("loading");
  const [events, setEvents] = useState<Ev[]>(() => loadJson<Ev[]>(EV_KEY, []));
  const [fert, setFert] = useState<Fert[]>(() => loadJson<Fert[]>(FERT_KEY, []));
  const [archive] = useState<Op[]>(() => loadJson<Op[]>(OPS_KEY, []));

  const zones = useRef<[Zone | null, Zone | null]>([null, null]);
  const prevValves = useRef<[boolean, boolean]>([false, false]);
  const prevPump = useRef<boolean | null>(null);
  const holdUntil = useRef(0);
  const localOk = useRef(false);
  const offlineLogged = useRef(false);
  const faultLogged = useRef(false);

  /* ---------- event log ---------- */
  const log = useCallback((msg: string, level: Level = "info", cat: EvCat = "System") => {
    const ev: Ev = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(), cat, level, msg,
    };
    setEvents((xs) => [ev, ...xs].slice(0, 500));
  }, []);

  useEffect(() => { saveJson(EV_KEY, events); }, [events]);
  useEffect(() => { saveJson(FERT_KEY, fert); }, [fert]);

  const readOnly = account.role === "viewer";
  const clearEvents = useCallback(() => { if (!readOnly) setEvents([]); }, [readOnly]);

  /* ---------- fertigation records ---------- */
  const addFert = useCallback((r: Omit<Fert, "id" | "by">) => {
    if (readOnly) return;
    const rec: Fert = { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, by: account.name };
    setFert((xs) => [rec, ...xs].sort((a, b) => b.ts - a.ts));
    log(`Fertigation recorded: ${r.fertilizer} (${r.bed})`, "info", "Fertigation");
  }, [account.name, log, readOnly]);

  const removeFert = useCallback((id: string) => { if (!readOnly) setFert((xs) => xs.filter((x) => x.id !== id)); }, [readOnly]);

  /* ---------- live data ---------- */
  const setPumpState = useCallback((p: boolean) => {
    if (prevPump.current !== null && prevPump.current !== p) {
      log(p ? "Pump started" : "Pump stopped", "info", "Pump");
    }
    prevPump.current = p;
    setPump(p);
  }, [log]);

  const applyBed = useCallback((i: 0 | 1, pct: number | null) => {
    if (pct == null) return;
    if (i === 0) setB1(pct); else setB2(pct);
    const z = zoneOf(pct);
    const before = zones.current[i];
    if (before !== null && before !== z) {
      const text = z === "dry" ? "dry" : z === "wet" ? "wet" : "back in the optimal range";
      log(`Bed ${i + 1} is now ${text} (${pct}%)`, z === "dry" ? "warn" : "info", "Sensor");
    }
    zones.current[i] = z;
  }, [log]);

  const loadLive = useCallback(async (full: boolean) => {
    const url = `https://api.thingspeak.com/channels/${CFG.dataChannel}/feeds.json?api_key=${CFG.dataReadKey}&results=${full ? 8000 : 1}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const js = await res.json();
      const rows: Record<string, string>[] = js.feeds || [];
      const F = CFG.F;
      const mapped: Feed[] = rows.map((f) => ({
        id: String(f.entry_id),
        t: new Date(f.created_at).getTime(),
        b1: num(f["field" + F.moist1]),
        b2: num(f["field" + F.moist2]),
        flow: num(f["field" + F.flow]),
        pump: num(f["field" + F.pump]),
      }));
      const last = mapped[mapped.length - 1];
      if (full) {
        setFeeds(mapped);
        setFeedsState("ok");
      } else if (last) {
        setFeeds((xs) => (xs.length && xs[xs.length - 1].id === last.id ? xs : [...xs, last].slice(-9000)));
      }
      if (!last) { log("No data in the ThingSpeak channel yet", "warn", "Link"); return; }
      applyBed(0, last.b1);
      applyBed(1, last.b2);
      if (!localOk.current) {
        if (last.flow != null) setFlow(last.flow);
        if (last.pump != null) setPumpState(last.pump > 0);
        else if (last.flow != null) setPumpState(last.flow > 0);
        setLastUpdate(last.t);
        const stale = (Date.now() - last.t) / 1000 > 120;
        setStatus(stale ? "stale" : "online");
        setSource("ThingSpeak");
      }
      offlineLogged.current = false;
    } catch (e) {
      if (full) setFeedsState("error");
      if (!localOk.current) setStatus("offline");
      if (!offlineLogged.current) {
        offlineLogged.current = true;
        log("Could not read ThingSpeak: " + (e instanceof Error ? e.message : "error"), "alert", "Link");
      }
    }
  }, [applyBed, log, setPumpState]);

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
      if (!localOk.current) log("Connected directly to the ESP32 on the local network", "info", "Link");
      localOk.current = true;
      if (j.bed1 >= 0) applyBed(0, num(j.bed1));
      if (j.bed2 >= 0) applyBed(1, num(j.bed2));
      if (j.flow != null) setFlow(Number(j.flow));
      setPumpState(Number(j.pump) === 1);
      if (typeof j.mode === "string" && j.mode) setMode(j.mode);
      if (Date.now() >= holdUntil.current) {
        const a = Number(j.v1) === 1;
        const b = Number(j.v2) === 1;
        if (a !== prevValves.current[0]) log(`Valve 1 ${a ? "opened" : "closed"}`, "info", "Valve");
        if (b !== prevValves.current[1]) log(`Valve 2 ${b ? "opened" : "closed"}`, "info", "Valve");
        setV1(a); setV2(b);
        prevValves.current = [a, b];
      }
      setLastUpdate(Date.now());
      setStatus("online");
      setSource("ESP32 local");
      if (j.fault && !faultLogged.current) {
        faultLogged.current = true;
        log("FLOW FAULT — pump stopped by the controller", "alert", "Pump");
      }
      if (!j.fault) faultLogged.current = false;
      setCtl(j.fault ? "FLOW FAULT — pump stopped" : "Direct local control");
      return true;
    } catch {
      if (localOk.current) log("Lost the direct ESP32 connection — falling back to ThingSpeak", "warn", "Link");
      localOk.current = false;
      return false;
    }
  }, [applyBed, log, setPumpState]);

  useEffect(() => {
    log(`${account.name} logged in`, "info", "Account");
    void loadLive(true);
    void syncLocal();
    const poll = window.setInterval(() => {
      void loadLive(false);
      if (CFG.preferLocalControl) void syncLocal();
    }, CFG.pollMs);
    const full = window.setInterval(() => void loadLive(true), 10 * 60 * 1000);
    const tick = window.setInterval(() => setNow(Date.now()), 5000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(full);
      window.clearInterval(tick);
    };
  }, [account.name, loadLive, log, syncLocal]);

  /* ---------- valve control ---------- */
  const onValve = useCallback(async (which: 1 | 2, next: boolean) => {
    if (readOnly) { log("View-only account blocked from sending a control command.", "warn", "Account"); return; }
    let a = which === 1 ? next : v1;
    let b = which === 2 ? next : v2;
    if (which === 1 && next) b = false;
    if (which === 2 && next) a = false;
    setV1(a); setV2(b);
    prevValves.current = [a, b];
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
            ? `${account.name}: local STOP sent. Physical Manual/Fertigation switches still have priority.`
            : `${account.name}: local command sent, Valve ${a ? "1" : "2"} ON.`, "info", "Valve");
          setCtl("Sent to ESP32");
          await syncLocal();
          return;
        } catch (err) {
          log("Local ESP32 unavailable: " + (err instanceof Error ? err.message : "error"), "warn", "Link");
          log("Trying ThingSpeak fallback (~15 s).", "info", "Link");
        }
      }
      const url = `https://api.thingspeak.com/update?api_key=${CFG.ctlWriteKey}`
        + `&field${CFG.ctlFields.pump}=${pumpFlag}`
        + `&field${CFG.ctlFields.valve1}=${a ? 1 : 0}`
        + `&field${CFG.ctlFields.valve2}=${b ? 1 : 0}`;
      const id = await (await fetch(url)).text();
      if (id.trim() === "0") {
        log("ThingSpeak rate limit (1 write / 15 s). Try again in a few seconds.", "warn", "Valve");
        setCtl("Rate limited – retry soon");
      } else {
        log(!a && !b
          ? `${account.name}: remote STOP sent through ThingSpeak.`
          : `${account.name}: ThingSpeak command queued, Valve ${a ? "1" : "2"} OPEN (applied on the next ESP32 poll, ~15 s).`, "info", "Valve");
        setCtl("Queued via ThingSpeak");
      }
    } catch (e) {
      setV1(prevValves.current[0]);
      setV2(prevValves.current[1]);
      log("Valve command failed: " + (e instanceof Error ? e.message : "error"), "alert", "Valve");
      setCtl("Error");
    }
  }, [account.name, log, readOnly, syncLocal, v1, v2]);

  /* ---------- water operations ---------- */
  const derived = useMemo(() => deriveOps(feeds), [feeds]);
  const ops = useMemo(() => mergeOps(archive, derived), [archive, derived]);
  useEffect(() => {
    if (feedsState !== "ok") return;
    saveJson(OPS_KEY, ops.filter((o) => !o.open).slice(0, 2000));
  }, [ops, feedsState]);

  const value: System = {
    account, readOnly, now, b1, b2, flow, pump, v1, v2, ctl, status, source, mode, lastUpdate,
    feeds, feedsState, ops, events, fert,
    log, clearEvents, addFert, removeFert, onValve,
    refresh: () => void loadLive(true),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
