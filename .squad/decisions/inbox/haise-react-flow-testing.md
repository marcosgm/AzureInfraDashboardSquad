# Decision: React Flow Component Testing Strategy

**Author:** Haise (Tester)  
**Date:** 2026-03-01  
**Status:** Implemented

## Context
Phase 2 introduced `@xyflow/react` (React Flow v12) and `@dagrejs/dagre` for the resource diagram. These libraries don't work in jsdom (no canvas, no layout engine). Needed a testing strategy for component tests.

## Decision
Mock React Flow and dagre at the module level in component tests:
- `@xyflow/react` → simple div-based components that render node data
- `@xyflow/react/dist/style.css` → empty object
- `@dagrejs/dagre` → stub Graph class with no-op methods
- `useNodesState`/`useEdgesState` → return `[initialState, setterFn, onChangeFn]` (3-element tuple)
- `useResourceGraph` hook → fully mocked to control loading/error/graph states

This lets us test the component's rendering logic (loading, error, empty, success states) without needing a real canvas or layout engine.

## Impact
- **Swigert:** If React Flow API changes (e.g., hook signatures), update mocks in `ResourceDiagram.test.tsx`
- **Haise:** Pattern is reusable for any future React Flow components
- **All:** Integration/E2E tests (Playwright/Cypress, future) should cover actual diagram rendering
