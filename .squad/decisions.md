# Decisions

## 2026-03-01T16:22:48Z: User Directive — Credential Security

**Author:** Marcos (via Copilot)  
**Status:** Active

Never store Azure credentials in the filesystem. Use environment variables from the system only.

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
