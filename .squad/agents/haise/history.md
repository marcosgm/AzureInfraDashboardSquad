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

### Phase 2 — Resource Discovery Tests (DONE, 2026-03-01)
- **Resource service tests (7):** `src/services/azure/__tests__/resources.test.ts` — fetch from Azure, resourceGroup parsing from ID, malformed ID fallback, cache keyed by subscriptionId, cache hit on second call, AzureAuthError on credential failure, AzureServiceError on 429 rate limit.
- **Relationship service tests (8):** `src/services/azure/__tests__/relationships.test.ts` — empty input, VNet→Subnet parent/child containment, VM→NIC uses, NIC→Subnet attachedTo, WebApp→AppServicePlan hostedOn, no relationships for unrelated types, no cross-resource-group type matching, malformed IDs don't crash.
- **Resources API route tests (8):** `src/app/api/subscriptions/[subscriptionId]/resources/__tests__/route.test.ts` — 200 with graph, passes subscriptionId, 401 on auth, 429 on rate limit, 503 on service error, 500 on env error, 500 on unknown error, response matches ResourceGraphResponse contract.
- **ResourceDiagram component tests (4):** `src/components/__tests__/ResourceDiagram.test.tsx` — loading state, error state with retry button, empty state (no resources), React Flow canvas renders for non-empty graph. Mocks: @xyflow/react, @dagrejs/dagre, CSS import, ResourceNode, useResourceGraph hook.
- **Total new tests:** 27. Suite total: 47 tests across 8 suites, all passing.
- **Mocking pattern for React Flow:** Mock `@xyflow/react` with simple div components, mock `@xyflow/react/dist/style.css` as empty object, mock `@dagrejs/dagre` with stub Graph class. `useNodesState`/`useEdgesState` return 3-element arrays `[state, setter, onChange]`.
- **DefaultAzureCredential mock leakage:** `jest.clearAllMocks()` does NOT reset `.mockImplementation()`. Tests that override DefaultAzureCredential to throw must be ordered carefully, or subsequent tests must explicitly reset the mock with `.mockImplementation(() => ({}))`.
- **Error class instanceof in route tests:** Route tests need real class instances (not plain Error) for instanceof checks. Define error classes locally in the test file and use them in the mock module.
