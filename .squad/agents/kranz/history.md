# Kranz — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** TBD (real-time dashboard app)
- **User:** Marcos
- **Description:** Real-time Azure infrastructure visualization with interactive diagrams, dashboard charts (uptime, latency, usage), Azure MCP for discovery, telemetry APIs, 5-minute cache refresh.

## Learnings
- **Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS + node-cache
- **Azure SDK trap:** `@azure/arm-subscriptions` v6 is for subscription lifecycle (cancel/rename/enable). Use `@azure/arm-resources-subscriptions` to *list* subscriptions via `client.subscriptions.list()`.
- **Auth:** `DefaultAzureCredential` from `@azure/identity` — reads `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` from env. Never store creds in files.
- **Config:** Next.js 14 does not support `next.config.ts` — use `next.config.mjs`.
- **Key files:**
  - `ARCHITECTURE.md` — system architecture and interface contracts
  - `src/app/api/subscriptions/route.ts` — API route
  - `src/services/azure/subscriptions.ts` — Azure SDK wrapper with cache
  - `src/services/cache.ts` — node-cache singleton (5-min TTL)
  - `src/components/SubscriptionList.tsx` — frontend table component
  - `src/types/azure.ts` — shared type definitions
  - `.env.example` — documents required env vars (no secrets)
- **User preference:** Marcos wants MVP-first approach, TypeScript everywhere, no stored credentials.
