# Azure Infrastructure Visualizer — Architecture

## MVP Scope

**Goal:** Display a list of Azure subscriptions available to the authenticated user.

This is a deliberately minimal first iteration. No diagrams, charts, or resource
discovery yet — just prove the Azure connection pipeline end-to-end:
environment credentials → Azure SDK → cache → API route → browser.

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 14 (App Router)** | Single project for frontend + API routes; zero extra servers |
| Language | **TypeScript** | End-to-end type safety, team preference |
| Azure Auth | **@azure/identity `DefaultAzureCredential`** | Reads `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` from env automatically — no credential files |
| Azure SDK | **@azure/arm-resources-subscriptions** | Official SDK for listing subscriptions |
| Cache | **node-cache (in-memory)** | Lightweight, no infrastructure; 5-minute TTL |
| Styling | **Tailwind CSS** | Fast prototyping, ships with Next.js setup |

### Why Next.js over separate frontend/backend?

For the MVP the only backend work is a single API route (`GET /api/subscriptions`).
Next.js API routes eliminate the need for Express, a second process, and CORS config.
When the app grows, we can extract a dedicated backend if needed.

---

## Component Overview

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│  ┌───────────────────────────────────────┐   │
│  │  React (Next.js App Router)           │   │
│  │  - page.tsx  →  SubscriptionList.tsx  │   │
│  └──────────────┬────────────────────────┘   │
│                 │ fetch /api/subscriptions    │
└─────────────────┼───────────────────────────┘
                  ▼
┌─────────────────────────────────────────────┐
│         Next.js API Route (server)           │
│  src/app/api/subscriptions/route.ts          │
│                 │                            │
│        ┌────────▼────────┐                   │
│        │   Cache Layer    │ (node-cache, 5m) │
│        └────────┬────────┘                   │
│          miss?  │                            │
│        ┌────────▼────────┐                   │
│        │  Azure Service   │                  │
│        │  (subscriptions) │                  │
│        └────────┬────────┘                   │
└─────────────────┼───────────────────────────┘
                  ▼
         Azure Resource Manager
         (management.azure.com)
```

---

## Data Flow

1. **Credentials** — `DefaultAzureCredential` reads from environment variables:
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   These are **never stored in files**. Set them in your shell or `.env.local`
   (which is git-ignored by default in Next.js).

2. **API call** — `GET /api/subscriptions` checks the in-memory cache.
   - **Hit →** return cached JSON immediately.
   - **Miss →** call Azure SDK `SubscriptionClient.subscriptions.list()`,
     store result in cache (TTL 5 min), return JSON.

3. **Frontend** — `page.tsx` calls the API route on mount, renders the
   subscription list via `<SubscriptionList>`.

---

## Interface Contracts

### `GET /api/subscriptions`

**Response `200`**
```jsonc
{
  "subscriptions": [
    {
      "id": "/subscriptions/xxxx-xxxx",
      "subscriptionId": "xxxx-xxxx",
      "displayName": "My Azure Sub",
      "state": "Enabled",
      "tenantId": "yyyy-yyyy"
    }
    // ...
  ]
}
```

**Response `500`**
```jsonc
{
  "error": "Failed to fetch subscriptions",
  "details": "string (only in development)"
}
```

### TypeScript types (src/types/azure.ts)

```ts
interface AzureSubscription {
  id: string;
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId: string;
}
```

---

## Directory Layout

```
/
├── ARCHITECTURE.md          ← this file
├── package.json
├── tsconfig.json
├── next.config.mjs
├── .env.example             ← documents required env vars (no secrets)
├── src/
│   ├── app/
│   │   ├── layout.tsx       ← root layout
│   │   ├── page.tsx         ← home page, renders subscription list
│   │   └── api/
│   │       └── subscriptions/
│   │           └── route.ts ← GET handler
│   ├── components/
│   │   └── SubscriptionList.tsx
│   ├── services/
│   │   ├── azure/
│   │   │   └── subscriptions.ts  ← Azure SDK wrapper
│   │   └── cache.ts              ← node-cache singleton
│   └── types/
│       └── azure.ts              ← shared type definitions
```

---

## Security Notes

- **Read-only** Azure connection — the service principal should have `Reader` role only.
- Credentials live exclusively in environment variables.
- `.env.local` is git-ignored; `.env.example` contains variable names only.
- No secrets in source control, ever.

---

## Future (post-MVP)

- Resource discovery per subscription (VMs, networks, databases)
- Interactive topology diagrams (React Flow or similar)
- Dashboard charts: uptime, latency, usage
- Azure MCP server integration for discovery
- Metric cache with 5-minute background refresh
- WebSocket or SSE for live updates
