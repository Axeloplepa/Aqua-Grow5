import type { ReactNode } from "react";

export const INPUT =
  "mt-1 w-full rounded-xl border border-line bg-sidebar px-3 py-2.5 text-ink outline-none focus:border-leaf";
export const BTN =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-sidebar hover:bg-leaf-2 disabled:opacity-50";
export const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-surface-2 disabled:opacity-50";

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-6 text-sm font-bold text-muted first:mt-0">{children}</h2>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-card border border-line bg-surface p-5 ${className}`}>{children}</section>
  );
}

export function Pill({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
      <i className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-faint">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-4">
      <p className="text-xs font-semibold text-faint">{label}</p>
      <p className="mt-1 truncate text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Toggle({
  label, sub, on, onChange,
}: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
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

export function Stat({
  title, big, sub, on, icon,
}: { title: string; big: string; sub: string; on: boolean; icon?: ReactNode }) {
  return (
    <section className="min-w-0 rounded-card border border-line bg-surface p-5 text-center">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
        <span className="inline-flex items-center gap-2">{icon}{title}</span>
      </div>
      <i className={`mx-auto mb-2 block h-4 w-4 rounded-full ${on ? "bg-ok" : "bg-faint"}`} />
      <p className="text-4xl font-extrabold">{big}</p>
      <p className="text-sm text-faint">{sub}</p>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-faint">{children}</p>;
}

/** Table wrapper that scrolls sideways inside itself so the page never overflows. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export const TH = "whitespace-nowrap border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-faint";
export const TD = "whitespace-nowrap border-b border-line px-4 py-2.5 last-of-type:border-b-0";
