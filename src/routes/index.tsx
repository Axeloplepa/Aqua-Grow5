import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CloudSun, Download, Eye, EyeOff, Info, LayoutDashboard, LogOut, Menu, QrCode, ScrollText, Sprout, User, Users, Waves,
  type LucideIcon,
} from "lucide-react";
import { CFG, passwordHash, type Account } from "@/lib/irrigation";
import { SystemProvider } from "@/lib/system";
import { Overview } from "@/components/pages/Overview";
import { Weather } from "@/components/pages/Weather";
import { WaterUsage } from "@/components/pages/WaterUsage";
import { Fertigation } from "@/components/pages/Fertigation";
import { EventLog } from "@/components/pages/EventLog";
import { DataExport } from "@/components/pages/DataExport";
import { About } from "@/components/pages/About";
import { Researchers } from "@/components/pages/Researchers";
import { ShareQR } from "@/components/pages/ShareQR";

export const Route = createFileRoute("/")({ component: Home });

type Phase = "splash" | "login" | "app";
type Page = "overview" | "weather" | "water" | "fertigation" | "events" | "export" | "about" | "researchers" | "share";

const NAV: { title: string; items: { id: Page; label: string; icon: LucideIcon }[] }[] = [
  {
    title: "Monitoring",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "weather", label: "Weather", icon: CloudSun },
    ],
  },
  {
    title: "Water & fertilizer",
    items: [
      { id: "water", label: "Water usage", icon: Waves },
      { id: "fertigation", label: "Fertigation", icon: Sprout },
    ],
  },
  {
    title: "Records",
    items: [
      { id: "events", label: "Event log", icon: ScrollText },
      { id: "export", label: "Data export", icon: Download },
    ],
  },
  {
    title: "Project",
    items: [
      { id: "about", label: "About", icon: Info },
      { id: "researchers", label: "Researchers", icon: Users },
      { id: "share", label: "Share (QR)", icon: QrCode },
    ],
  },
];

const PAGES: Record<Page, () => ReactNode> = {
  overview: () => <Overview />,
  weather: () => <Weather />,
  water: () => <WaterUsage />,
  fertigation: () => <Fertigation />,
  events: () => <EventLog />,
  export: () => <DataExport />,
  about: () => <About />,
  researchers: () => <Researchers />,
  share: () => <ShareQR />,
};

function Home() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [page, setPage] = useState<Page>("overview");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [authErr, setAuthErr] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("login"), 2400);
    return () => window.clearTimeout(t);
  }, []);

  function signOut() {
    setAccount(null);
    setPage("overview");
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
        <div className="aqua-splash flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-canvas px-6">
          <div className="logo-assembly" aria-label="Aqua-Grow logo animation">
            <span className="logo-ring logo-ring-one" />
            <span className="logo-ring logo-ring-two" />
            <span className="logo-orbit"><span /></span>
            <img src="/logo.png" alt="Aqua-Grow" className="anim-logo aspect-square w-full max-w-xs rounded-full object-cover" />
            <span className="logo-glint" />
          </div>
          <div className="splash-wordmark text-center">
            <p className="text-xl font-extrabold tracking-[0.24em] text-ink sm:text-2xl">AQUA-GROW</p>
            <p className="mt-2 text-xs font-bold tracking-[0.2em] text-muted sm:text-sm">IRRIGATION AND FERTIGATION</p>
            <span className="splash-progress" />
          </div>
        </div>
      )}

      {phase === "login" && (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
          <img
            src="/login-bg.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55" />
          <form
            onSubmit={onLogin}
            className="anim-up relative w-full max-w-sm rounded-3xl border border-white/30 bg-white/10 p-7 text-white shadow-2xl backdrop-blur-xl sm:p-8"
          >
            <img src="/logo.png" alt="Aqua-Grow" className="mx-auto mb-4 h-24 w-24 rounded-full object-cover shadow-lg" />
            <h1 className="text-center text-2xl font-extrabold tracking-tight">Login</h1>
            <p className="mt-1 text-center text-sm text-white/80">Sign in to open the irrigation dashboard.</p>

            <label className="sr-only" htmlFor="user">Username</label>
            <div className="relative mt-6">
              <input
                id="user"
                placeholder="Username"
                autoCapitalize="none"
                autoComplete="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full border-0 border-b border-white/60 bg-transparent py-2.5 pr-9 text-white outline-none placeholder:text-white/70 focus:border-white"
              />
              <User size={18} className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-white/80" />
            </div>

            <label className="sr-only" htmlFor="pass">Password</label>
            <div className="relative mt-5">
              <input
                id="pass"
                type={showPass ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full border-0 border-b border-white/60 bg-transparent py-2.5 pr-9 text-white outline-none placeholder:text-white/70 focus:border-white"
              />
              <button
                type="button"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="mt-7 w-full rounded-full bg-white px-4 py-3 font-bold text-[#0c242c] hover:bg-white/90">
              Log in
            </button>
            <p className={`mt-3 min-h-5 text-center text-sm ${authErr ? "text-[#ffc2c9]" : "text-white/80"}`}>{authMsg}</p>
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
    <SystemProvider account={account}>
      <div className="flex min-h-screen">
        {navOpen && (
          <button aria-label="Close menu" className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onToggle} />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-line bg-sidebar px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center gap-3 px-2">
            <img src="/logo.png" alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            <div>
              <p className="text-sm font-extrabold tracking-wide">AQUA-GROW</p>
              <p className="text-xs text-faint">Irrigation & fertigation</p>
            </div>
          </div>
          <nav className="nav-scroll flex-1 overflow-y-auto pr-1">
            {NAV.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{group.title}</p>
                <div className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <NavBtn key={item.id} active={page === item.id} onClick={() => onNav(item.id)} icon={<item.icon size={18} />}>
                      {item.label}
                    </NavBtn>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-2 border-t border-line pt-3">
            <p className="px-3 pb-1 text-xs text-faint">{account.name}</p>
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-leaf">{account.role === "viewer" ? "View-only access" : "Administrator"}</p>
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
            <button onClick={onToggle} aria-label="Open menu" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-bold">
              <Menu size={16} /> Menu
            </button>
            <span className="font-extrabold">AQUA-GROW</span>
          </header>
          <main className="flex-1 px-4 py-5 lg:px-8">{PAGES[page]()}</main>
        </div>
      </div>
    </SystemProvider>
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
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
        active ? "bg-leaf text-sidebar" : "text-ink hover:bg-surface"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
