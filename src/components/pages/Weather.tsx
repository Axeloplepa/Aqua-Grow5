import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, RefreshCw, Sun, Thermometer, Wind,
} from "lucide-react";
import { CFG } from "@/lib/irrigation";
import { BTN_GHOST, Card, Metric, PageHeader, SectionTitle } from "@/components/ui";

type Wx = {
  current: {
    temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number;
    precipitation: number; weather_code: number; wind_speed_10m: number; time: string;
  };
  daily: {
    time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[];
    precipitation_sum: number[]; precipitation_probability_max: number[];
  };
};

type IconT = ComponentType<{ size?: number; className?: string }>;
function describe(code: number): { label: string; Icon: IconT } {
  if (code === 0) return { label: "Clear sky", Icon: Sun };
  if (code === 1 || code === 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "Fog", Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Rain", Icon: CloudRain };
  if (code >= 95) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Cloudy", Icon: Cloud };
}

export function Weather() {
  const [wx, setWx] = useState<Wx | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { lat, lon } = CFG.weather;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max" +
      "&timezone=Asia%2FManila&forecast_days=5";
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      setWx((await res.json()) as Wx);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);

  const cur = wx ? describe(wx.current.weather_code) : null;
  const rainToday = wx ? wx.daily.precipitation_probability_max[0] : 0;
  const mmToday = wx ? wx.daily.precipitation_sum[0] : 0;
  const skip = wx != null && (rainToday >= 60 || mmToday >= 5);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Weather"
        sub={CFG.weather.name}
        right={
          <button onClick={() => void load()} disabled={loading} className={BTN_GHOST}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {err && !wx && (
        <p className="rounded-card border border-line bg-surface px-4 py-3 text-sm text-warn">
          Could not load the weather ({err}). Check the internet connection and press Refresh.
        </p>
      )}

      {wx && cur && (
        <>
          <Card className="flex flex-wrap items-center gap-5">
            <cur.Icon size={64} className="shrink-0 text-warn" />
            <div className="min-w-0">
              <p className="text-5xl font-extrabold tracking-tight">{Math.round(wx.current.temperature_2m)}°C</p>
              <p className="text-muted">{cur.label} · feels like {Math.round(wx.current.apparent_temperature)}°C</p>
            </div>
          </Card>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Humidity" value={`${wx.current.relative_humidity_2m}%`} />
            <Metric label="Wind" value={`${Math.round(wx.current.wind_speed_10m)} km/h`} />
            <Metric label="Rain now" value={`${wx.current.precipitation} mm`} />
            <Metric label="Rain chance today" value={`${rainToday}%`} sub={`${mmToday.toFixed(1)} mm expected`} />
          </div>

          <p className={`mt-4 rounded-card border px-4 py-3 text-sm ${skip ? "border-drop bg-drop/15 text-ink" : "border-line bg-surface text-muted"}`}>
            <Droplets size={16} className="mr-2 inline align-[-2px]" />
            {skip
              ? "Rain is likely today — the beds may get enough water naturally, so you can hold off manual irrigation."
              : "Little rain is expected today, so the soil moisture sensors will decide when to irrigate."}
          </p>

          <SectionTitle>5-day forecast</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {wx.daily.time.map((d, i) => {
              const w = describe(wx.daily.weather_code[i]);
              const date = new Date(d + "T00:00:00");
              return (
                <Card key={d} className="p-4 text-center">
                  <p className="text-sm font-bold">{i === 0 ? "Today" : date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}</p>
                  <w.Icon size={36} className="mx-auto my-2 text-warn" />
                  <p className="text-xs text-muted">{w.label}</p>
                  <p className="mt-1 font-bold">
                    <Thermometer size={14} className="mr-1 inline align-[-2px] text-faint" />
                    {Math.round(wx.daily.temperature_2m_max[i])}° / {Math.round(wx.daily.temperature_2m_min[i])}°
                  </p>
                  <p className="text-xs text-muted">
                    <Wind size={12} className="mr-1 inline align-[-1px]" />Rain {wx.daily.precipitation_probability_max[i]}% · {wx.daily.precipitation_sum[i].toFixed(1)} mm
                  </p>
                </Card>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-faint">Forecast data by Open-Meteo for Roxas City, updated every 15 minutes while this page is open.</p>
        </>
      )}
      {loading && !wx && !err && <p className="text-sm text-muted">Loading the forecast…</p>}
    </div>
  );
}
