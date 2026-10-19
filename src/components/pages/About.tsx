import { ArrowDown } from "lucide-react";
import { CFG } from "@/lib/irrigation";
import { Card, PageHeader, SectionTitle } from "@/components/ui";

const STEPS = [
  ["Sensing", "Four capacitive soil moisture sensors (two per planter bed) are read by an Arduino Nano field node."],
  ["Sending", "The field node sends the Bed 1 and Bed 2 moisture percentages over an RS485 link to the ESP32-S3 main controller."],
  ["Deciding", `When a bed falls below ${CFG.lowThreshold}% the controller opens that bed's solenoid valve and starts the pump; it stops once the soil reaches ${CFG.highThreshold}%.`],
  ["Measuring", "A flow sensor in the main line measures the water that actually goes out, so every pump run can be recorded in liters."],
  ["Reporting", "The ESP32 uploads moisture, flow and pump state to ThingSpeak, and this dashboard reads that data live."],
  ["Controlling", "Valves can also be opened from this dashboard, directly over the local network or through ThingSpeak. The panel switches always have priority."],
];

const PARTS = [
  "ESP32-S3 main controller",
  "Arduino Nano field sensor node",
  "4 capacitive soil moisture sensors",
  "RS485 (MAX485) field link",
  "YF-S201 water flow sensor",
  "2 solenoid valves (one per bed)",
  "1 HP water pump with contactor",
  "Venturi fertigation injector",
  "Two 20x4 I2C LCDs",
  "Sprinklers on both planter beds",
];

export function About() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="About the project" />

      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-faint">Research title</p>
        <h2 className="mt-1 text-xl font-extrabold leading-snug">
          Development of Soil Moisture-Based Automated Irrigation and Fertigation System for the Garden of Roxas City School for Philippine Craftsmen
        </h2>
        <p className="mt-2 text-sm text-muted">Group 5 · Roxas City School for Philippine Craftsmen · Roxas City, Capiz</p>
      </Card>

      <SectionTitle>Objectives</SectionTitle>
      <Card className="space-y-3 text-sm leading-relaxed text-muted">
        <p className="font-bold text-ink">Statement of the Problem</p>
        <p>
          Generally, this study aims to develop a soil moisture-based automated irrigation and fertigation system for the vegetable and fruit garden of Roxas City School for Philippine Craftsmen.
        </p>
        <p>Specifically, it seeks to answer the following questions:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            What is the design of the developed system in terms of:
            <ol className="mt-1 list-[lower-alpha] space-y-1 pl-5">
              <li>hardware components;</li>
              <li>soil moisture sensing and irrigation control mechanism; and</li>
              <li>fertigation activation mechanism</li>
            </ol>
          </li>
          <li>
            What is the performance and consistency of the developed Soil Moisture-Based Automated Irrigation and Fertigation System through ten (10) experimental trials in terms of:
            <ol className="mt-1 list-[lower-alpha] space-y-1 pl-5">
              <li>Irrigation Response Time;</li>
              <li>Soil Moisture Accuracy;</li>
              <li>Irrigation Coverage Diameter and;</li>
              <li>Fertilizer Injection Volume per minute</li>
            </ol>
          </li>
          <li>
            Is there a significant difference in water consumption and completion time between the developed Soil Moisture-Based Automated Irrigation and Fertigation System and manual watering?
          </li>
        </ol>
      </Card>

      <SectionTitle>Diagrams</SectionTitle>
      <div className="grid gap-4">
        {[
          ["/plumbing.png", "Plumbing diagram"],
          ["/circuit-power.png", "Heavy power control block"],
          ["/circuit-central.png", "Central control station"],
          ["/circuit-field.png", "Field sensor hub"],
        ].map(([src, cap]) => (
          <figure key={src} className="overflow-hidden rounded-card border border-line bg-surface">
            <img src={src} alt={cap} className="w-full bg-white" />
            <figcaption className="px-4 py-3 text-sm font-semibold">{cap}</figcaption>
          </figure>
        ))}
      </div>

      <SectionTitle>How it works</SectionTitle>
      <ol className="grid gap-2">
        {STEPS.map(([title, text], i) => (
          <li key={title}>
            <div className="flex gap-4 rounded-card border border-line bg-surface p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf text-sm font-extrabold text-sidebar">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-bold">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && <ArrowDown size={16} className="mx-auto mt-2 text-faint" aria-hidden />}
          </li>
        ))}
      </ol>

      <SectionTitle>Control limits</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="text-center"><p className="text-3xl font-extrabold text-bad">&lt; {CFG.lowThreshold}%</p><p className="text-sm text-muted">Dry — irrigation starts</p></Card>
        <Card className="text-center"><p className="text-3xl font-extrabold text-ok">{CFG.lowThreshold}–{CFG.highThreshold}%</p><p className="text-sm text-muted">Optimal range</p></Card>
        <Card className="text-center"><p className="text-3xl font-extrabold" style={{ color: "#38a9e0" }}>&gt; {CFG.highThreshold}%</p><p className="text-sm text-muted">Wet — irrigation stops</p></Card>
      </div>

      <SectionTitle>Main components</SectionTitle>
      <Card>
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {PARTS.map((p) => (
            <li key={p} className="flex items-center gap-2"><i className="h-2 w-2 shrink-0 rounded-full bg-leaf" />{p}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
