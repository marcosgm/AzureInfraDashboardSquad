# Haise — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Azure SDK (@azure/identity, @azure/arm-resources-subscriptions, @azure/arm-resources in Phase 2), node-cache (5-min TTL), Jest + React Testing Library
- **User:** Marcos
- **Description:** Real-time Azure infrastructure visualization with interactive diagrams, dashboard charts (uptime, latency, usage), Azure MCP for discovery, telemetry APIs, 5-minute cache refresh.

## Learnings
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Azure SDK (@azure/identity, @azure/arm-resources-subscriptions), node-cache (5-min TTL)
- **Test framework:** Jest + ts-jest, React Testing Library, jest-environment-jsdom. Config uses `projects` to split server (node) and client (jsdom) environments.
- **Path aliases:** `@/*` → `./src/*` — must be mirrored in jest.config.ts `moduleNameMapper`.
- **JSX in tests:** ts-jest requires explicit `{ tsconfig: { jsx: "react-jsx" } }` override for component tests since tsconfig.json uses `"preserve"`.
- **SubscriptionList is presentational:** Accepts `subscriptions` as props. Loading/error/empty states are managed by the parent `Dashboard` component via `useSubscriptions` hook.
- **Azure env validation:** `src/services/azure/env.ts` validates env vars before SDK calls. Must be mocked in service tests.
- **Custom error classes:** `AzureEnvError`, `AzureAuthError`, `AzureServiceError` used for granular error handling in the API route. Route returns different HTTP status codes per error type (500, 401, 429, 503).
- **Key file paths:**
  - `jest.config.ts` — test configuration
  - `src/services/__tests__/cache.test.ts` — cache unit tests
  - `src/services/azure/__tests__/subscriptions.test.ts` — subscription service tests
  - `src/app/api/subscriptions/__tests__/route.test.ts` — API route tests
  - `src/components/__tests__/SubscriptionList.test.tsx` — component tests
  - `src/services/azure/env.ts` — Azure env validation (not in ARCHITECTURE.md)
  - `src/components/Dashboard.tsx` — orchestrator component with loading/error states
  - `src/hooks/useSubscriptions.ts` — data fetching hook (not in ARCHITECTURE.md)

### MVP Test Coverage (2026-03-01)
- **Cache unit tests:** 6 tests (set, get, clear, TTL, expiry events)
- **Subscription service tests:** 5 tests (successful list, auth error, service error, rate limit, env validation)
- **API route tests:** 4 tests (success path, 401 auth error, 429 rate limit, 503 service error)
- **Component tests:** 5 tests (SubscriptionList rendering, loading state, error state, empty state, item selection)
- **Total:** 20 tests, all passing

### Cross-Agent Context (2026-03-01)
- **Lovell's Backend:** API route tests validate all error code paths (401 for auth, 429 for rate limit, 503 for service issues, 500 for config). Error classes are mocked in the route test suite.
- **Swigert's Frontend:** Dashboard component receives `useSubscriptions` hook result. Tests mock the hook and pass subscriptions as props to the `SubscriptionList` component. Error state card displays HTTP status code to determine message.

### Phase 2 — Resource Discovery Tests (IN_PROGRESS, 2026-03-01T17:20:26Z)
- **New service to test:** `src/services/azure/resources.ts` — lists resources via `ResourceManagementClient`, handles errors
- **New service to test:** `src/services/azure/relationships.ts` — pure function taking resource array, returning relationship edges. Test static mapping (VNet → Subnet, VM → NIC, etc.)
- **New API route to test:** `src/app/api/subscriptions/[subscriptionId]/resources/route.ts` — success path, auth error (401), rate limit (429), service error (503), cache hit/miss
- **New component to test:** `src/components/ResourceDiagram.tsx` — React Flow canvas renders nodes and edges; zoom/pan controls work
- **New component to test:** `src/components/ResourceNode.tsx` — renders resource name, type label; hover shows tooltip with resource group
- **New hook to test:** `src/hooks/useResourceGraph.ts` — fetches from API, auto-polls every 5 min, handles errors, refetch on demand
- **Test structure will mirror Phase 1:**
  - Service tests: mock Azure SDK, validate data transformation, error handling
  - API route tests: mock service layer, validate HTTP status codes, cache behavior
  - Component tests: mock hooks, validate rendering and interactions
