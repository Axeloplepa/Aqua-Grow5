# Aqua-Grow — Automated Smart Irrigation & Fertigation Dashboard

Group 5 thesis project, Roxas City School for Philippine Craftsmen.
Web dashboard (TanStack Start + React + Tailwind) for the ESP32-based irrigation and fertigation system:
live soil moisture (ThingSpeak), valve control (local ESP32 or ThingSpeak fallback), pump/flow status, and event log.

## Researchers
- Amongo, Jessa Mae D.
- Apelo, Pauline R.
- Caldeo, Axle Russ F.
- Clavaton, Ricky John A.
- Dalumpines, Mary Ellaine Joy C.
- Navarro, Lea May D.

## Run locally
```bash
npm install
npm run dev      # http://localhost:8080
```

## Deploy
Import the repo in Vercel (framework: Other). `vercel.json` and the Nitro `vercel` preset handle the build.

## Config
Channel IDs, API keys, local ESP32 address and user accounts live in `src/lib/irrigation.ts`.
> Keep this repository **private** — the file contains ThingSpeak keys and password hashes.
