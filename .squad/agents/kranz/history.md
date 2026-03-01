# Kranz — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS + node-cache + @azure/arm-resources (Phase 2)
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

### Phase 1 — Subscription Listing (COMPLETE, 2026-03-01T16:22:48Z)
- Created `src/services/azure/subscriptions.ts` with `@azure/arm-resources-subscriptions` SDK wrapper
- Implemented typed error classes (`AzureEnvError`, `AzureAuthError`, `AzureServiceError`) for granular error handling
- Built MVP dashboard with `useSubscriptions` hook, `Dashboard` orchestrator, `SummaryBar` with auto-refresh (5 min)
- Styling with slate palette (professional/Azure Portal aesthetic)
- All 20 tests passing (cache, subscriptions service, API route, components)
- **ARCHITECTURE.md updated** with stack decisions, key design rules, consequences

### Phase 2 — Resource Discovery & Diagram (DESIGN APPROVED, 2026-03-01T17:20:26Z)
- **Design review ceremony completed.** Decisions documented in `.squad/orchestration-log/20260301T172026Z-kranz.md` and merged into `.squad/decisions.md`.
- **Azure SDK for resources:** `@azure/arm-resources` with `ResourceManagementClient.resources.list()`. **NOT** `@azure/arm-resources-subscriptions` or `@azure/arm-subscriptions` v6.
- **Resource group parsing:** `GenericResource` does NOT include `resourceGroup` as a field. Parse from resource ID: `/subscriptions/{subId}/resourceGroups/{rgName}/providers/...`
- **Relationship strategy (MVP):** Static mapping + ID parsing. No Azure Resource Graph queries. Pure function in `relationships.ts`.
- **Diagram library:** `@xyflow/react` (React Flow v12, MIT) + `@dagrejs/dagre` (MIT auto-layout). No Pro subscription needed.
- **API endpoint:** `GET /api/subscriptions/[subscriptionId]/resources` — cached 5 min per subscription.
- **Frontend routing:** Next.js dynamic route `src/app/subscriptions/[subscriptionId]/page.tsx`. SubscriptionList rows become `<Link>` elements.
- **Data model:** New types — `AzureResource`, `ResourceRelationship`, `ResourceGraph`, `ResourceGraphResponse` in `src/types/azure.ts`.
- **Dependencies to install:** `@azure/arm-resources`, `@xyflow/react`, `@dagrejs/dagre`
- **Key new files (to create by team):**
  - `src/services/azure/resources.ts` — resource listing service
  - `src/services/azure/relationships.ts` — relationship inference (pure function)
  - `src/app/api/subscriptions/[subscriptionId]/resources/route.ts` — API route
  - `src/components/ResourceDiagram.tsx` — React Flow canvas
  - `src/components/ResourceNode.tsx` — custom node component
  - `src/hooks/useResourceGraph.ts` — data fetching hook
- **Node design:** Show resource name + short type label. Tooltip on hover shows resource group name.
- **Next:** Lovell (backend), Swigert (frontend), Haise (tests) spawn concurrently to implement Phase 2.
