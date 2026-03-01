# Lovell — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + node-cache + @azure/arm-resources-subscriptions (Phase 1), @azure/arm-resources (Phase 2)
- **User:** Marcos
- **Description:** Real-time Azure infrastructure visualization with interactive diagrams, dashboard charts (uptime, latency, usage), Azure MCP for discovery, telemetry APIs, 5-minute cache refresh.

## Architecture (from Kranz — 2026-03-01T16:22:48Z)

**Stack Decision:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Azure Auth: `@azure/identity` `DefaultAzureCredential` (env vars only, no credential files)
- Subscriptions SDK: `@azure/arm-resources-subscriptions` (correct for listing, not `@azure/arm-subscriptions` v6)
- Cache: node-cache (in-memory, 5-min TTL)
- Styling: Tailwind CSS

**Key Rules:**
1. No credential files — `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` via env only
2. Read-only Azure access — service principal with Reader role
3. Single API route: `GET /api/subscriptions` with 5-minute cache
4. Minimal scope: subscription list only (charts/diagrams deferred)

**Project Structure:**
- `ARCHITECTURE.md` — system design and interface contracts
- `src/app/api/subscriptions/route.ts` — API endpoint (Lovell's focus)
- `src/services/azure/subscriptions.ts` — Azure SDK wrapper with cache
- `src/services/cache.ts` — Cache singleton
- `src/types/azure.ts` — Type definitions
- `.env.example` — Environment variable template

**User Directive:**
Never store Azure credentials in the filesystem — use environment variables only.

## Learnings

### Backend MVP Implementation (2026-03-01)
- Created `src/services/azure/env.ts` — validates `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` are set before calling Azure SDK. Throws `AzureEnvError` with clear message listing missing vars.
- `src/services/azure/subscriptions.ts` — added typed error classes (`AzureAuthError`, `AzureServiceError`) wrapping Azure SDK `RestError`. Handles 401/403 (auth), 429 (rate limit), and generic REST errors separately. Console logging for cache hits/misses and errors.
- `src/services/cache.ts` — added `useClones: true` to prevent callers from mutating cached data. Added `deleteOnExpire: true` and an `expired` event listener for observability. TTL constants extracted for clarity.
- `src/app/api/subscriptions/route.ts` — returns 401 for auth errors, 429 for rate limits, 503 for Azure service issues, 500 for config/unknown errors. Development-only `details` field preserved.
- `@azure/core-rest-pipeline` is a transitive dependency (from `@azure/arm-resources-subscriptions`) — `RestError` import works without adding it to `package.json`.
- `.env.example` was already scaffolded by Kranz with the three required vars.
- Build passes clean with `npm run build`.

### Cross-Agent Context (2026-03-01)
- **Swigert's Dashboard:** Now consuming differentiated HTTP error codes to show targeted error UI (401 → "Unauthorized", 429 → "Rate Limited", 503 → "Service Unavailable", etc.)
- **Haise's Tests:** Typed error classes (`AzureEnvError`, `AzureAuthError`, `AzureServiceError`) are exported and mocked in the API route test suite. Route test coverage includes all four error code paths (401, 429, 503, 500).

### Phase 2 — Resource Discovery (IN_PROGRESS, 2026-03-01T17:20:26Z)
- **New Azure SDK:** `@azure/arm-resources` (NOT `@azure/arm-resources-subscriptions` or `@azure/arm-subscriptions`). Use `ResourceManagementClient(credential, subscriptionId).resources.list()` to enumerate all resources in a subscription.
- **Resource group parsing:** `GenericResource` from SDK does NOT include `resourceGroup` field. Must parse from resource ID: `/subscriptions/{subId}/resourceGroups/{rgName}/providers/...`
- **Relationship discovery:** Static mapping + ID parsing. Pure function in `src/services/azure/relationships.ts`. Examples: VNet ID contains Subnet ID (parent/child), VM → NIC (type map), NIC → Subnet (type map). No Azure Resource Graph queries (MVP).
- **New data types in `src/types/azure.ts`:**
  - `AzureResource` — id, name, type, resourceGroup (parsed), location
  - `ResourceRelationship` — sourceId, targetId, type ("contains", "links", "depends-on")
  - `ResourceGraph` — nodes (resources) + edges (relationships)
  - `ResourceGraphResponse` — subscriptionId, resourceGraph, cachedAt
- **New API endpoint:** `GET /api/subscriptions/[subscriptionId]/resources` — returns `ResourceGraphResponse`, cached 5 min per subscription (key: `azure:resources:{subscriptionId}`)
- **New service files (to create):**
  - `src/services/azure/resources.ts` — lists resources via ResourceManagementClient, handles errors
  - `src/services/azure/relationships.ts` — takes resource array, returns relationship edges (pure function)
  - `src/app/api/subscriptions/[subscriptionId]/resources/route.ts` — API endpoint with caching

### Phase 2 — Resource Discovery Implementation (2026-03-01)
- Installed `@azure/arm-resources` — uses `ResourceManagementClient(credential, subscriptionId).resources.list()` to paginate all resources in a subscription.
- `src/types/azure.ts` — added `AzureResource`, `ResourceRelationship`, `ResourceGraph`, `ResourceGraphResponse` types per Kranz's design.
- `src/services/azure/resources.ts` — `listResources(subscriptionId)` fetches all resources, parses `resourceGroup` from resource ID (SDK doesn't include it on `GenericResource`), caches per subscription with key `azure:resources:{subscriptionId}`. Same error handling pattern as `subscriptions.ts` — reuses `AzureAuthError`/`AzureServiceError`.
- `src/services/azure/relationships.ts` — `discoverRelationships(resources)` is a pure function (no Azure calls). Two strategies: (1) parent/child from ID containment (sorted by ID length, keeps only closest parent), (2) known type map matching within same resource group (VM→NIC, NIC→Subnet, WebApp→AppServicePlan, SqlDb→SqlServer).
- `src/app/api/subscriptions/[subscriptionId]/resources/route.ts` — GET handler returning `ResourceGraphResponse`. Same error-code mapping as subscriptions route (401, 429, 503, 500). Dev-only `details` field.
- Build passes clean. All 20 existing tests still pass.

