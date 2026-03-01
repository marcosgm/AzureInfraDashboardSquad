# Swigert — History

## Project Context
- **Project:** Azure Infrastructure Visualizer
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + node-cache
- **User:** Marcos
- **Description:** Real-time Azure infrastructure visualization with interactive diagrams, dashboard charts (uptime, latency, usage), Azure MCP for discovery, telemetry APIs, 5-minute cache refresh.

## Architecture (from Kranz — 2026-03-01T16:22:48Z)

**Stack Decision:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Cache: node-cache (in-memory, 5-min TTL)
- Styling: Tailwind CSS
- Frontend Component: `src/components/SubscriptionList.tsx` (Swigert's focus)

**Key Rules:**
1. No credential files — all auth via environment variables
2. Single API route: `GET /api/subscriptions` returns list of subscriptions
3. Minimal scope: subscription list only (charts/diagrams deferred)

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

### MVP Dashboard Polish (frontend-mvp)
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

