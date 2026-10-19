import { PageHeader } from "@/components/ui";

const RESEARCHERS = [
  "Amongo, Jessa Mae D.",
  "Apelo, Pauline R.",
  "Caldeo, Axle Russ F.",
  "Clavaton, Ricky John A.",
  "Dalumpines, Mary Ellaine Joy C.",
  "Navarro, Lea May D.",
];

export function Researchers() {
  return (
    <section className="mx-auto max-w-4xl">
      <PageHeader title="Researchers" sub="Group 5 — Roxas City School for Philippine Craftsmen" />
      <img src="/researchers.jpg" alt="Group 5 researchers" className="w-full rounded-card border border-line" />
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
