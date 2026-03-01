# Decision: Resource Discovery & Diagram Architecture (Phase 2)

**Author:** Kranz (Lead)  
**Date:** 2025-07-18  
**Status:** Approved

## Context

Marcos requested that clicking a subscription shows an interactive architecture diagram of Azure resources with their relationships. Resource names are displayed as node labels; resource group is revealed on mouse hover.

## Decisions

### 1. Azure SDK — `@azure/arm-resources`

Use `@azure/arm-resources` with `ResourceManagementClient(credential, subscriptionId).resources.list()` to list ALL resources in a subscription.

**Trap to avoid:** This is a DIFFERENT package from `@azure/arm-resources-subscriptions` (which lists subscriptions) and `@azure/arm-subscriptions` (subscription lifecycle). Triple-check import names.

### 2. Data Model

New types in `src/types/azure.ts`:
- `AzureResource` — id, name, type, resourceGroup (parsed from ID), location
- `ResourceRelationship` — sourceId, targetId, type
- `ResourceGraph` — nodes + edges
- `ResourceGraphResponse` — API response wrapper

### 3. API Endpoint

`GET /api/subscriptions/[subscriptionId]/resources` — returns `ResourceGraphResponse` with 5-minute cache keyed by `azure:resources:{subscriptionId}`.

### 4. Relationship Discovery — Static Mapping + ID Parsing

MVP approach — no Azure Resource Graph queries:
- Parent/child from resource ID containment (VNet → Subnet)
- Hardcoded known-type map (VM → NIC, NIC → Subnet, WebApp → AppServicePlan)
- Pure function in `src/services/azure/relationships.ts`

### 5. Diagram Library — React Flow + Dagre

- `@xyflow/react` (v12, MIT) for interactive canvas
- `@dagrejs/dagre` (MIT) for free hierarchical auto-layout
- No Pro subscription needed

### 6. Frontend Routing

Next.js App Router: `src/app/subscriptions/[subscriptionId]/page.tsx`
SubscriptionList rows become `<Link>` elements navigating to the diagram.

## Impact

- **Lovell:** Create `resources.ts` service, `relationships.ts`, API route
- **Swigert:** Install React Flow + Dagre, create `ResourceDiagram`, `ResourceNode`, `useResourceGraph`, update `SubscriptionList` with links
- **Haise:** New test suites for resource service, relationships, API route, diagram component
