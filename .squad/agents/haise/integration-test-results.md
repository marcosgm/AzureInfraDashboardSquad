# Integration Test Results

**Date:** 2026-03-01  
**Tester:** Haise  
**Environment:** Live Azure (real credentials)

---

## 1. Subscriptions Endpoint (`GET /api/subscriptions`)

- **Status:** ✅ PASS  
- **HTTP Response:** 200 OK  
- **Subscriptions returned:** 6  
- **Response structure:** Array wrapped in `{ subscriptions: [...] }` with fields: `id`, `subscriptionId`, `displayName`, `state`, `tenantId`
- **Caching:** Verified — second request returned immediately (cache hit logged)

---

## 2. Resources Endpoint (`GET /api/subscriptions/:id/resources`)

Tested all 6 subscriptions.

| Subscription # | Nodes (Resources) | Edges (Relationships) |
|---------------|-------------------|-----------------------|
| 1             | 9                 | 0                     |
| 2             | 9                 | 0                     |
| 3             | 9                 | 0                     |
| 4             | 5                 | 0                     |
| 5             | 6                 | 0                     |
| 6             | 10                | 1                     |

- **Status:** ✅ PASS  
- **HTTP Response:** 200 OK for all subscriptions  
- **Total resources found across all subscriptions:** 48 nodes  
- **Relationship inference (edges):** ✅ Partially working — 1 subscription had 1 inferred edge; 5 had 0 edges (likely resources in those subs have no inferrable relationships)
- **Response structure:** `{ subscriptionId, graph: { nodes, edges } }`  
- **Node fields:** `id`, `name`, `type`, `resourceGroup`, `location`
- **Caching:** Verified — repeat requests returned immediately (cache hit logged)

---

## 3. Error Handling Test (Missing Credentials)

- **Test:** Restarted server with `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` unset  
- **Status:** ✅ PASS  
- **HTTP Response:** 500 Internal Server Error  
- **Response body:** Proper JSON error with descriptive message indicating which env vars are missing and guidance not to commit secrets  
- **Content-Type:** `application/json` ✅

---

## Summary

| Test                              | Result  |
|-----------------------------------|---------|
| Subscriptions endpoint (live)     | ✅ PASS |
| Resources endpoint (all subs)     | ✅ PASS |
| Graph structure (nodes + edges)   | ✅ PASS |
| Relationship inference (edges)    | ✅ PARTIAL (works when applicable) |
| Response caching                  | ✅ PASS |
| Error handling (missing creds)    | ✅ PASS |

---

## Issues Found

- **Edge inference is sparse:** Only 1 out of 48 resources across 6 subscriptions had an inferred relationship edge. This may be expected if the resources don't share VNets/resource groups in a way the inference logic recognises, but warrants a review of the edge-inference rules to ensure they cover common Azure resource relationship patterns (e.g., VM → NIC → VNet, App Service → App Service Plan).
- No crashes or unhandled errors observed during testing.
