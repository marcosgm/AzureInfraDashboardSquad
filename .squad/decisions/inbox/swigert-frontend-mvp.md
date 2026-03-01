# Decision: Frontend MVP Dashboard Architecture

**Author:** Swigert (Frontend Dev)
**Date:** Auto-generated during frontend-mvp task

## Context
The initial scaffolding had `SubscriptionList` handling its own data fetching, loading, and error states inline. As the dashboard grew to need a summary bar, refresh controls, and a header, this monolithic approach didn't scale.

## Decision
1. **Custom hook for data fetching (`useSubscriptions`)**: All fetch logic, auto-refresh (5 min), countdown timer, and refresh state live in a single hook. This keeps data logic reusable and out of components.

2. **Presentational SubscriptionList**: The component now receives `subscriptions` as props and focuses purely on rendering the table. No `useEffect`, no fetch calls.

3. **Dashboard orchestrator component**: A `Dashboard` client component owns the hook and renders the summary bar, skeleton loaders, error states, and subscription list.

4. **DashboardHeader in layout.tsx**: The navbar is a server component rendered in the root layout, so it appears on every page without re-rendering.

5. **Slate color palette**: Switched from `gray-*` to `slate-*` for a cooler, more professional tone aligned with Azure Portal aesthetics.

## Impact
- All team members should import from `@/hooks/useSubscriptions` if they need subscription data on the client.
- `SubscriptionList` now requires a `subscriptions` prop — it no longer fetches its own data.
- New components are in `src/components/`: `Dashboard.tsx`, `DashboardHeader.tsx`, `SummaryBar.tsx`, `SkeletonTable.tsx`.
