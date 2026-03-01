# Decision: Resource Discovery Backend Patterns

**Author:** Lovell (Backend Dev)  
**Date:** 2026-03-01  
**Status:** Implemented

## Context
Phase 2 required resource discovery — listing all Azure resources in a subscription and inferring relationships for diagram rendering.

## Decisions

### 1. Error class reuse
Reused `AzureAuthError` and `AzureServiceError` from `subscriptions.ts` rather than creating new error classes. The resources route imports them from the same module. This keeps error handling consistent across all Azure API routes.

### 2. Relationship inference is a pure function
`discoverRelationships()` takes an `AzureResource[]` and returns `ResourceRelationship[]` with no side effects or Azure calls. This makes it trivially testable and keeps the Azure SDK call boundary in `resources.ts` only.

### 3. Resource group parsed from ID
The Azure SDK's `GenericResource` does not include `resourceGroup` as a top-level field. We parse it from the resource ID using a regex (`/resourceGroups/([^/]+)/`). This is a well-known Azure pattern — all ARM resource IDs follow the same structure.

### 4. Type-based relationships scoped to resource group
Known type mappings (VM→NIC, NIC→Subnet, etc.) only match resources within the same resource group. This avoids false positives in multi-RG subscriptions while keeping the heuristic simple.

## Impact
- **Swigert (Frontend):** New API endpoint `GET /api/subscriptions/[subscriptionId]/resources` returns `ResourceGraphResponse` with `nodes` and `edges` ready for React Flow rendering.
- **Haise (Testing):** `listResources` follows same mock pattern as `listSubscriptions`. `discoverRelationships` is a pure function — easy to unit test with fixture data.
