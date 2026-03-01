# Decisions

## 2026-03-01T16:22:48Z: User Directive — Credential Security

**Author:** Marcos (via Copilot)  
**Status:** Active

Never store Azure credentials in the filesystem. Use environment variables from the system only.

---

## 2026-03-01T17:26:12Z: User Directive — Azure Test Credentials

**By:** Marcos (via Copilot)  
**Status:** Active

Azure credentials for testing are at `../setAzureEnv.sh` (relative to the project root). Source this file before running any live integration tests against Azure.

---

## 2026-03-01T16:23:00Z: Backend Error Handling Strategy

**Author:** Lovell (Backend Dev)  
**Date:** 2026-03-01  
**Status:** Implemented

### Context
The scaffolded backend returned HTTP 500 for all error types. The API route needed differentiated error responses so the frontend can show appropriate messages.

### Decision
Introduced typed error classes in the Azure service layer:
- `AzureEnvError` — missing credentials configuration
- `AzureAuthError` — Azure rejected credentials (401/403)
- `AzureServiceError` — Azure API failures, rate limits, network errors

The API route maps these to distinct HTTP status codes:
| Error Type | HTTP Status |
|---|---|
| `AzureEnvError` | 500 (server misconfiguration) |
| `AzureAuthError` | 401 (unauthorized) |
| `AzureServiceError` (rate limit) | 429 |
| `AzureServiceError` (other) | 503 (service unavailable) |
| Unknown | 500 |

Error details are only exposed in development mode (`NODE_ENV=development`).

### Impact
- **Frontend (Swigert):** Can now distinguish error types by HTTP status code to show targeted UI messages.
- **Testing (Haise):** Error classes are exported and can be mocked/asserted in tests.

---

## 2026-03-01T16:23:00Z: Frontend MVP Dashboard Architecture

**Author:** Swigert (Frontend Dev)  
**Date:** 2026-03-01  
**Status:** Implemented

### Context
The initial scaffolding had `SubscriptionList` handling its own data fetching, loading, and error states inline. As the dashboard grew to need a summary bar, refresh controls, and a header, this monolithic approach didn't scale.

### Decision
1. **Custom hook for data fetching (`useSubscriptions`)**: All fetch logic, auto-refresh (5 min), countdown timer, and refresh state live in a single hook. This keeps data logic reusable and out of components.

2. **Presentational SubscriptionList**: The component now receives `subscriptions` as props and focuses purely on rendering the table. No `useEffect`, no fetch calls.

3. **Dashboard orchestrator component**: A `Dashboard` client component owns the hook and renders the summary bar, skeleton loaders, error states, and subscription list.

4. **DashboardHeader in layout.tsx**: The navbar is a server component rendered in the root layout, so it appears on every page without re-rendering.

5. **Slate color palette**: Switched from `gray-*` to `slate-*` for a cooler, more professional tone aligned with Azure Portal aesthetics.

### Impact
- All team members should import from `@/hooks/useSubscriptions` if they need subscription data on the client.
- `SubscriptionList` now requires a `subscriptions` prop — it no longer fetches its own data.
- New components are in `src/components/`: `Dashboard.tsx`, `DashboardHeader.tsx`, `SummaryBar.tsx`, `SkeletonTable.tsx`.

---

## 2026-03-01T16:23:00Z: Test Infrastructure Setup

**Author:** Haise (Tester)  
**Date:** 2026-03-01  
**Status:** Implemented

### Decision
Chose **Jest + ts-jest** over Vitest for the test framework.

### Rationale
- Jest is the most mature test runner for Next.js projects with the widest ecosystem support.
- ts-jest provides reliable TypeScript transpilation without needing Babel.
- React Testing Library + jest-environment-jsdom for component tests.
- `projects` config separates server tests (node env) from client tests (jsdom env), avoiding environment mismatch issues.

### Test Structure
```
src/
  services/__tests__/cache.test.ts          — 6 tests
  services/azure/__tests__/subscriptions.test.ts — 5 tests
  app/api/subscriptions/__tests__/route.test.ts  — 4 tests
  components/__tests__/SubscriptionList.test.tsx  — 5 tests
```

Total: 20 tests, all passing.

### Dependencies Added (devDependencies)
- jest, ts-jest, @types/jest, ts-node
- @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
- jest-environment-jsdom

### Notes
- ARCHITECTURE.md shows SubscriptionList as a self-contained component with fetch/loading/error states. The actual implementation is a presentational component receiving props — tests were written against the actual code.
- `npm test` script added to package.json.

---

## 2026-03-01: MVP Architecture — Azure Infrastructure Visualizer

**Author:** Kranz (Lead)  
**Date:** 2026-03-01  
**Status:** Approved

### Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js 14 (App Router) | Single project for frontend + API; no CORS, no second server |
| Language | TypeScript | Team preference, end-to-end type safety |
| Azure Auth | `@azure/identity` `DefaultAzureCredential` | Reads env vars automatically; never stores creds on disk |
| Azure SDK | `@azure/arm-resources-subscriptions` | Correct SDK for *listing* subscriptions (not `@azure/arm-subscriptions` v6 which is for lifecycle mgmt) |
| Cache | `node-cache` (in-memory) | Zero infrastructure; 5-min TTL |
| Styling | Tailwind CSS | Ships with Next.js, fast prototyping |

### Key Design Rules

1. **No credential files** — `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` via env only.
2. **Read-only Azure access** — service principal with Reader role.
3. **Single API route** — `GET /api/subscriptions` with 5-minute cache.
4. **Minimal scope** — subscription list only; charts and diagrams deferred.

### Consequences

- Swigert (frontend) and Lovell (backend) can start immediately; project builds clean.
- The in-memory cache resets on server restart — acceptable for MVP.
- When we add resource discovery, we may need a background refresh worker.

---

## 2026-03-01T17:20:26Z: Phase 2 — Resource Discovery & Diagram Architecture

**Author:** Kranz (Lead)  
**Date:** 2026-03-01  
**Status:** Approved

### Context

Marcos requested clicking a subscription to show an interactive architecture diagram of Azure resources with their relationships. Resource names are displayed as node labels; resource group revealed on hover.

### Decisions

#### 1. Azure SDK — `@azure/arm-resources`

Use `ResourceManagementClient(credential, subscriptionId).resources.list()` to enumerate all resources in a subscription.

**Important:** This is different from `@azure/arm-resources-subscriptions` (subscription listing) and `@azure/arm-subscriptions` v6 (lifecycle).

#### 2. Data Model (New Types in `src/types/azure.ts`)

```typescript
interface AzureResource {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;    // Parsed from ID
  location: string;
}

interface ResourceRelationship {
  sourceId: string;
  targetId: string;
  type: string;  // "contains", "links", "depends-on"
}

interface ResourceGraph {
  nodes: AzureResource[];
  edges: ResourceRelationship[];
}

interface ResourceGraphResponse {
  subscriptionId: string;
  resourceGraph: ResourceGraph;
  cachedAt: string;
}
```

#### 3. API Endpoint

`GET /api/subscriptions/[subscriptionId]/resources` — returns `ResourceGraphResponse` with 5-minute cache keyed by `azure:resources:{subscriptionId}`.

#### 4. Relationship Discovery — Static Mapping + ID Parsing (MVP)

No Azure Resource Graph queries. Instead:
- Parent/child from resource ID containment (VNet → Subnet)
- Hardcoded known-type map (VM → NIC, NIC → Subnet, WebApp → AppServicePlan)
- Pure function in `src/services/azure/relationships.ts`

#### 5. Diagram Library — React Flow + Dagre

- `@xyflow/react` (v12, MIT) for interactive canvas
- `@dagrejs/dagre` (MIT) for free hierarchical auto-layout
- No Pro subscription required

#### 6. Frontend Routing

Next.js App Router: `src/app/subscriptions/[subscriptionId]/page.tsx`  
SubscriptionList rows become `<Link>` elements navigating to the diagram.

### Impact

- **Lovell:** Create `resources.ts` service, `relationships.ts`, API route
- **Swigert:** Install React Flow + Dagre, create `ResourceDiagram`, `ResourceNode`, `useResourceGraph`, update `SubscriptionList` with links
- **Haise:** New test suites for resource service, relationships, API route, diagram component

### Dependencies to Install

```json
{
  "@azure/arm-resources": "latest",
  "@xyflow/react": "latest",
  "@dagrejs/dagre": "latest"
}
```

---

## 2026-03-01T16:23:00Z: React Flow Component Testing Strategy

**Author:** Haise (Tester)  
**Date:** 2026-03-01  
**Status:** Implemented

### Context
Phase 2 introduced `@xyflow/react` (React Flow v12) and `@dagrejs/dagre` for the resource diagram. These libraries don't work in jsdom (no canvas, no layout engine). Needed a testing strategy for component tests.

### Decision
Mock React Flow and dagre at the module level in component tests:
- `@xyflow/react` → simple div-based components that render node data
- `@xyflow/react/dist/style.css` → empty object
- `@dagrejs/dagre` → stub Graph class with no-op methods
- `useNodesState`/`useEdgesState` → return `[initialState, setterFn, onChangeFn]` (3-element tuple)
- `useResourceGraph` hook → fully mocked to control loading/error/graph states

This lets us test the component's rendering logic (loading, error, empty, success states) without needing a real canvas or layout engine.

### Impact
- **Swigert:** If React Flow API changes (e.g., hook signatures), update mocks in `ResourceDiagram.test.tsx`
- **Haise:** Pattern is reusable for any future React Flow components
- **All:** Integration/E2E tests (Playwright/Cypress, future) should cover actual diagram rendering

---

## 2026-03-01T16:23:00Z: Resource Discovery Backend Patterns

**Author:** Lovell (Backend Dev)  
**Date:** 2026-03-01  
**Status:** Implemented

### Context
Phase 2 required resource discovery — listing all Azure resources in a subscription and inferring relationships for diagram rendering.

### Decisions

#### 1. Error class reuse
Reused `AzureAuthError` and `AzureServiceError` from `subscriptions.ts` rather than creating new error classes. The resources route imports them from the same module. This keeps error handling consistent across all Azure API routes.

#### 2. Relationship inference is a pure function
`discoverRelationships()` takes an `AzureResource[]` and returns `ResourceRelationship[]` with no side effects or Azure calls. This makes it trivially testable and keeps the Azure SDK call boundary in `resources.ts` only.

#### 3. Resource group parsed from ID
The Azure SDK's `GenericResource` does not include `resourceGroup` as a top-level field. We parse it from the resource ID using a regex (`/resourceGroups/([^/]+)/`). This is a well-known Azure pattern — all ARM resource IDs follow the same structure.

#### 4. Type-based relationships scoped to resource group
Known type mappings (VM→NIC, NIC→Subnet, etc.) only match resources within the same resource group. This avoids false positives in multi-RG subscriptions while keeping the heuristic simple.

### Impact
- **Swigert (Frontend):** New API endpoint `GET /api/subscriptions/[subscriptionId]/resources` returns `ResourceGraphResponse` with `nodes` and `edges` ready for React Flow rendering.
- **Haise (Testing):** `listResources` follows same mock pattern as `listSubscriptions`. `discoverRelationships` is a pure function — easy to unit test with fixture data.

---

## 2026-03-01T16:23:00Z: Resource Diagram Component Architecture

**Author:** Swigert (Frontend Dev)  
**Date:** 2026-03-01  
**Status:** Implemented

### Context
Phase 2 adds interactive resource diagrams. Needed to choose how to structure React Flow integration and data flow.

### Decision
1. **Dagre auto-layout via `applyDagreLayout` pure function**: Converts `ResourceGraph` (API types) to React Flow `Node[]`/`Edge[]` with computed positions. Runs once per graph fetch, not on every render.
2. **Custom node component (`ResourceNode`)**: Uses React Flow's custom node API with `memo()`. Tooltip state is local to each node — no global tooltip store needed.
3. **Type icon map**: Hardcoded `TYPE_ICONS` record maps lowercase Azure resource types to emoji. Falls back to ☁️ for unknown types. Easy to extend.
4. **Subscription link via `<Link>` on name + ID columns**: Rather than making the entire table row a link (which conflicts with the mobile expand button), only the name and ID cells are wrapped in `<Link>`.

### Impact
- **Haise (Testing):** `ResourceDiagram` can be tested by mocking `useResourceGraph`. `ResourceNode` is a pure component testable with React Testing Library.
- **Lovell (Backend):** Frontend expects `ResourceGraphResponse` shape from `GET /api/subscriptions/[id]/resources`.
- **Future:** Adding new resource type icons is a one-line addition to `TYPE_ICONS` map in `ResourceNode.tsx`.
