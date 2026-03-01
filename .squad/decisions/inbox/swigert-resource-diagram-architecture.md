# Decision: Resource Diagram Component Architecture

**Author:** Swigert (Frontend Dev)
**Date:** 2026-03-01
**Status:** Implemented

## Context
Phase 2 adds interactive resource diagrams. Needed to choose how to structure React Flow integration and data flow.

## Decision
1. **Dagre auto-layout via `applyDagreLayout` pure function**: Converts `ResourceGraph` (API types) to React Flow `Node[]`/`Edge[]` with computed positions. Runs once per graph fetch, not on every render.
2. **Custom node component (`ResourceNode`)**: Uses React Flow's custom node API with `memo()`. Tooltip state is local to each node — no global tooltip store needed.
3. **Type icon map**: Hardcoded `TYPE_ICONS` record maps lowercase Azure resource types to emoji. Falls back to ☁️ for unknown types. Easy to extend.
4. **Subscription link via `<Link>` on name + ID columns**: Rather than making the entire table row a link (which conflicts with the mobile expand button), only the name and ID cells are wrapped in `<Link>`.

## Impact
- **Haise (Testing):** `ResourceDiagram` can be tested by mocking `useResourceGraph`. `ResourceNode` is a pure component testable with React Testing Library.
- **Lovell (Backend):** Frontend expects `ResourceGraphResponse` shape from `GET /api/subscriptions/[id]/resources`.
- **Future:** Adding new resource type icons is a one-line addition to `TYPE_ICONS` map in `ResourceNode.tsx`.
