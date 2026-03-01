# Swigert — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + node-cache + React Flow (Phase 2)
- **User:** Marcos
- **Description:** Real-time Azure infrastructure visualization with interactive diagrams, dashboard charts (uptime, latency, usage), Azure MCP for discovery, telemetry APIs, 5-minute cache refresh.

## Architecture (from Kranz — 2026-03-01T16:22:48Z)

**Stack Decision:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Cache: node-cache (in-memory, 5-min TTL)
- Styling: Tailwind CSS
- Frontend Component: `src/components/SubscriptionList.tsx` (Swigert's Phase 1 focus)
- Diagram Library: React Flow v12 + Dagre (Phase 2)

**Key Rules:**
1. No credential files — all auth via environment variables
2. Single API route: `GET /api/subscriptions` returns list of subscriptions
3. Minimal scope: subscription list only (charts/diagrams deferred in Phase 1; diagrams in Phase 2)

**Project Structure:**
- `ARCHITECTURE.md` — system design and interface contracts
- `src/components/SubscriptionList.tsx` — Frontend table component (React)
- `src/types/azure.ts` — Type definitions (use these for component props)
- `src/app/api/subscriptions/route.ts` — API endpoint returns subscription data
- `.env.example` — Environment configuration

**API Contract:**
`GET /api/subscriptions` returns:
```json
{
  "subscriptions": [
    {
      "id": "string",
      "displayName": "string",
      "subscriptionId": "string"
    }
  ]
}
```

## Learnings

### MVP Dashboard Polish (frontend-mvp, 2026-03-01)
- **Architecture pattern:** Extracted data fetching into `src/hooks/useSubscriptions.ts` custom hook. The `Dashboard` component orchestrates state; `SubscriptionList` is now a pure presentational component receiving props.
- **Component structure:** `DashboardHeader` (server component in layout), `Dashboard` (client, owns data), `SummaryBar` (stats + refresh controls), `SubscriptionList` (table), `SkeletonTable` (loading state).
- **Key files:**
  - `src/hooks/useSubscriptions.ts` — fetch + auto-refresh (5 min) + countdown timer
  - `src/components/Dashboard.tsx` — main dashboard orchestrator
  - `src/components/DashboardHeader.tsx` — dark navbar, rendered in layout.tsx
  - `src/components/SummaryBar.tsx` — total/enabled/disabled counts + refresh button + timestamp
  - `src/components/SkeletonTable.tsx` — animated skeleton loader
- **Styling:** Moved from `gray-*` to `slate-*` palette throughout for a more professional/Azure Portal feel. Dark header (`bg-slate-900`), clean body (`bg-slate-100`).
- **State colors:** Enabled = emerald, Warned = amber, Disabled = red. Row backgrounds subtly tinted by state.
- **Responsive:** Tenant ID column hidden on mobile (`lg:table-cell`), replaced by an expand button that shows a detail panel.
- **Auto-refresh:** 5-minute interval with visible countdown in SummaryBar. Manual refresh button with spinner animation.
- **Error state:** Centered error card with retry button, icon, and error message text.
- **Build:** Compiles cleanly with `next build`, First Load JS ~90KB.

### Cross-Agent Context (2026-03-01)
- **Lovell's Backend:** API now returns differentiated HTTP status codes (401, 429, 503) instead of blanket 500. Dashboard's error state card now displays targeted messages based on status code.
- **Haise's Tests:** Dashboard component tests mock `useSubscriptions` hook and pass subscriptions as props. SubscriptionList is tested as a presentational component. Component test coverage includes loading, error, and success states.

### Phase 2 — Resource Diagram Frontend
- **New dependencies:** `@xyflow/react` v12 (React Flow) for interactive diagrams, `@dagrejs/dagre` for hierarchical auto-layout. Both MIT.
- **Component architecture:** Same pattern as Phase 1 — custom hook (`useResourceGraph`) owns fetch logic, `ResourceDiagram` orchestrates state (loading/error/empty/success), `ResourceNode` is a pure presentational node.
- **Key files:**
  - `src/hooks/useResourceGraph.ts` — fetches `GET /api/subscriptions/[id]/resources`, returns `{ graph, loading, error, refresh }`
  - `src/components/ResourceDiagram.tsx` — client component, converts `ResourceGraph` to React Flow nodes/edges via dagre layout, renders canvas with zoom/pan/controls
  - `src/components/ResourceNode.tsx` — custom React Flow node showing resource name, type icon, and hover tooltip with resource group name
  - `src/app/subscriptions/[subscriptionId]/page.tsx` — dynamic route server component with back navigation link
- **SubscriptionList changes:** Added `next/link` import; subscription name and ID columns are now clickable `<Link>` elements routing to `/subscriptions/[subscriptionId]`. Mobile expand button uses `e.stopPropagation()` to avoid conflicting interactions.
- **Styling:** Dark slate canvas (`bg-slate-900`) with `slate-800` nodes, consistent with existing dashboard palette. React Flow Controls styled via arbitrary Tailwind selectors.
- **Type generics fix:** `useNodesState<Node>([])` and `useEdgesState<Edge>([])` need explicit generic params with @xyflow/react v12 to avoid `never[]` inference.
- **Build:** Compiles cleanly, First Load JS for diagram page ~166 kB (includes React Flow). All 20 existing tests pass.

### Phase 2 — Resource Discovery Diagram (IN_PROGRESS, 2026-03-01T17:20:26Z)
- **Diagram library:** `@xyflow/react` (React Flow v12, MIT) + `@dagrejs/dagre` (MIT). No Pro subscription needed.
- **Frontend route:** `src/app/subscriptions/[subscriptionId]/page.tsx` — dynamic route for resource diagram
- **Data hook:** `src/hooks/useResourceGraph.ts` — fetches `GET /api/subscriptions/{id}/resources`, auto-poll every 5 min (aligns with backend cache)
- **Components to create:**
  - `src/components/ResourceDiagram.tsx` — React Flow canvas with Dagre hierarchical layout
  - `src/components/ResourceNode.tsx` — custom node: icon + resource name + type label; hover tooltip shows resource group
- **Navigation:** Update `SubscriptionList` rows to become `<Link href={`/subscriptions/${subId}`}>` elements pointing to diagram page
- **Data model:** Consumes `ResourceGraphResponse` from backend: `{ subscriptionId, resourceGraph: { nodes, edges }, cachedAt }`
- **Node rendering:** Show resource name + abbreviated type label (e.g., "WebApp", "Subnet"). Full resource group name appears in hover tooltip.
- **Edge rendering:** Simple arrows between nodes; edge type (contains, links, depends-on) drives styling/color

