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

### Phase 2 — Resource Discovery & Diagram
- **Azure SDK for resources:** `@azure/arm-resources` with `ResourceManagementClient.resources.list()`. Do NOT confuse with `@azure/arm-resources-subscriptions` (subscription listing) or `@azure/arm-subscriptions` (lifecycle).
- **Resource group parsing:** `GenericResource` from SDK does NOT include `resourceGroup` as a field. Parse it from resource ID: `/subscriptions/{subId}/resourceGroups/{rgName}/providers/...`
- **Relationship strategy (MVP):** Static mapping + ID parsing. No Azure Resource Graph queries. Pure function in `relationships.ts`.
- **Diagram library:** `@xyflow/react` (React Flow v12, MIT) + `@dagrejs/dagre` (free auto-layout). No Pro subscription needed.
- **API endpoint:** `GET /api/subscriptions/[subscriptionId]/resources` — cached 5 min per subscription.
- **Frontend routing:** Next.js dynamic route `src/app/subscriptions/[subscriptionId]/page.tsx`. SubscriptionList rows become `<Link>` elements.
- **Key new files (planned):**
  - `src/services/azure/resources.ts` — resource listing service
  - `src/services/azure/relationships.ts` — relationship inference
  - `src/app/api/subscriptions/[subscriptionId]/resources/route.ts` — API route
  - `src/components/ResourceDiagram.tsx` — React Flow canvas
  - `src/components/ResourceNode.tsx` — custom node component
  - `src/hooks/useResourceGraph.ts` — data fetching hook
- **Node design:** Show resource name + short type label. Tooltip on hover shows resource group name.
