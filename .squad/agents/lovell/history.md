# Lovell — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + node-cache + `@azure/arm-resources-subscriptions`
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

