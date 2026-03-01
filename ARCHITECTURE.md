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

---

## Phase 2 — Resource Discovery & Diagram

**Goal:** When a user clicks a subscription, display an interactive architecture
diagram showing all Azure resources and their relationships. Each node shows
the resource name; hovering reveals the resource group.

### New Dependencies

| Package | Purpose |
|---------|---------|
| `@azure/arm-resources` | `ResourceManagementClient.resources.list()` — lists ALL resources in a subscription |
| `@xyflow/react` | React Flow v12 — interactive node/edge diagrams |
| `@dagrejs/dagre` | Dagre graph layout engine — free auto-layout for React Flow |

> **SDK Lesson:** `@azure/arm-resources` is for resource CRUD and listing.
> Do NOT confuse with `@azure/arm-resources-subscriptions` (subscription listing)
> or `@azure/arm-subscriptions` (subscription lifecycle management).

### Data Model (`src/types/azure.ts` — additions)

```ts
/** A single Azure resource discovered in a subscription */
export interface AzureResource {
  id: string;               // Full ARM resource ID
  name: string;             // Resource name
  type: string;             // e.g. "Microsoft.Compute/virtualMachines"
  resourceGroup: string;    // Parsed from resource ID
  location: string;         // Azure region
}

/** A relationship between two resources */
export interface ResourceRelationship {
  sourceId: string;         // Resource ID of source
  targetId: string;         // Resource ID of target
  type: string;             // e.g. "contains", "uses", "attachedTo"
}

/** Complete graph for diagram rendering */
export interface ResourceGraph {
  nodes: AzureResource[];
  edges: ResourceRelationship[];
}

/** API response wrapper */
export interface ResourceGraphResponse {
  subscriptionId: string;
  graph: ResourceGraph;
}
```

### Resource ID Parsing

Azure resource IDs follow a predictable structure:
```
/subscriptions/{subId}/resourceGroups/{rgName}/providers/{namespace}/{type}/{name}
```

The `resourceGroup` field is NOT on the SDK's `GenericResource` object.
We parse it from the resource ID:
```ts
function parseResourceGroup(resourceId: string): string {
  const match = resourceId.match(/\/resourceGroups\/([^/]+)/i);
  return match?.[1] ?? "unknown";
}
```

### Relationship Discovery Strategy

MVP uses a **static mapping + ID parsing** approach. No Azure Resource Graph
queries needed — keep it simple.

**1. Parent/Child from Resource ID structure:**
Resources whose IDs are prefixes of other IDs are parents. Example:
- `/subscriptions/.../Microsoft.Network/virtualNetworks/myVNet`
- `/subscriptions/.../Microsoft.Network/virtualNetworks/myVNet/subnets/default`

The VNet is a parent of the Subnet.

**2. Known Type Relationships (hardcoded map):**

| Source Type | Target Type | Relationship |
|-------------|-------------|--------------|
| `Microsoft.Compute/virtualMachines` | `Microsoft.Network/networkInterfaces` | `uses` |
| `Microsoft.Network/networkInterfaces` | `Microsoft.Network/virtualNetworks/subnets` | `attachedTo` |
| `Microsoft.Web/sites` | `Microsoft.Web/serverfarms` | `hostedOn` |
| `Microsoft.Sql/servers/databases` | `Microsoft.Sql/servers` | `childOf` |
| `Microsoft.Storage/storageAccounts` | (standalone) | — |

Implementation in `src/services/azure/relationships.ts`:
- Iterate all resources
- Check for parent/child ID containment
- Match known type pairs by scanning resource IDs cross-referenced in resource properties
- Return `ResourceRelationship[]`

**3. Future Enhancement (deferred):**
- Azure Resource Graph queries for richer dependency data
- Resource property inspection (e.g., VM's `networkProfile.networkInterfaces[]`)

### API Design

#### `GET /api/subscriptions/[subscriptionId]/resources`

**Route file:** `src/app/api/subscriptions/[subscriptionId]/resources/route.ts`

**Response `200`:**
```jsonc
{
  "subscriptionId": "xxxx-xxxx",
  "graph": {
    "nodes": [
      {
        "id": "/subscriptions/.../Microsoft.Compute/virtualMachines/myVM",
        "name": "myVM",
        "type": "Microsoft.Compute/virtualMachines",
        "resourceGroup": "my-rg",
        "location": "eastus"
      }
    ],
    "edges": [
      {
        "sourceId": "/subscriptions/.../virtualMachines/myVM",
        "targetId": "/subscriptions/.../networkInterfaces/myVM-nic",
        "type": "uses"
      }
    ]
  }
}
```

**Error responses:** Same pattern as `/api/subscriptions` (401, 429, 500, 503).

**Caching:** 5-minute TTL keyed by `azure:resources:{subscriptionId}`.
Uses existing `src/services/cache.ts` singleton.

**Service layer:** `src/services/azure/resources.ts`
- `listResources(subscriptionId: string): Promise<AzureResource[]>`
- Uses `ResourceManagementClient(credential, subscriptionId).resources.list()`
- Parses `resourceGroup` from each resource ID
- Same error handling pattern as `subscriptions.ts` (AzureAuthError, AzureServiceError)

**Relationship service:** `src/services/azure/relationships.ts`
- `discoverRelationships(resources: AzureResource[]): ResourceRelationship[]`
- Pure function — no Azure calls, operates on already-fetched resources
- Applies parent/child ID parsing + known type map

### Diagram Library — React Flow + Dagre

**Package:** `@xyflow/react` (React Flow v12, MIT license)

**Why React Flow:**
- Most popular React diagram library (~20k GitHub stars)
- Custom React components as nodes (we render resource name + icon)
- Built-in zoom, pan, edge rendering, mouse events
- Tooltip on hover is native via `onNodeMouseEnter`/`onNodeMouseLeave`
- Works with Tailwind CSS

**Auto-layout:** `@dagrejs/dagre` (free, MIT license)
- Hierarchical top-to-bottom layout algorithm
- Computes (x, y) positions for each node given edges
- React Flow's official Dagre example uses this exact approach
- No Pro subscription needed

**Node design:**
```
┌──────────────────────┐
│  🖥️  myVM            │  ← Resource name + type icon
│  virtualMachines     │  ← Short type label
└──────────────────────┘
   Hover tooltip: "Resource Group: my-rg"
```

### Frontend Routing

**Next.js App Router dynamic route:**

```
src/app/subscriptions/[subscriptionId]/page.tsx
```

**Navigation flow:**
1. User sees subscription list on `/` (Dashboard)
2. Each subscription row becomes a clickable link: `<Link href={/subscriptions/${sub.subscriptionId}}>`
3. Clicking navigates to `/subscriptions/{id}` which renders the `ResourceDiagram` component
4. `ResourceDiagram` fetches `GET /api/subscriptions/{id}/resources` and renders React Flow

**Component structure:**
```
src/app/subscriptions/[subscriptionId]/page.tsx  ← Server component, reads param
src/components/ResourceDiagram.tsx               ← Client component, React Flow
src/components/ResourceNode.tsx                  ← Custom React Flow node
src/hooks/useResourceGraph.ts                    ← Data fetching hook
```

**Back navigation:** Breadcrumb or back button to return to Dashboard.

### Updated Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                       Browser                            │
│  ┌───────────────────────────────────────────────────┐   │
│  │  / (Dashboard)                                    │   │
│  │  SubscriptionList → click row → navigate          │   │
│  └──────────────┬────────────────────────────────────┘   │
│                 │                                        │
│  ┌──────────────▼────────────────────────────────────┐   │
│  │  /subscriptions/[id] (ResourceDiagram)            │   │
│  │  React Flow canvas with Dagre auto-layout         │   │
│  │  Nodes = resources, Edges = relationships         │   │
│  │  Hover node → tooltip with resource group         │   │
│  └──────────────┬────────────────────────────────────┘   │
│                 │ fetch /api/subscriptions/[id]/resources │
└─────────────────┼───────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────────┐
│         Next.js API Route (server)                       │
│  src/app/api/subscriptions/[subscriptionId]/resources/   │
│                 │                                        │
│        ┌────────▼────────┐                               │
│        │   Cache Layer    │ (node-cache, 5m)             │
│        │  key: azure:resources:{subId}                   │
│        └────────┬────────┘                               │
│          miss?  │                                        │
│        ┌────────▼────────┐   ┌──────────────────┐        │
│        │ Resource Service │──▶│ Relationship Svc │       │
│        │ (list resources) │   │ (infer edges)    │       │
│        └────────┬────────┘   └──────────────────┘        │
└─────────────────┼───────────────────────────────────────┘
                  ▼
         Azure Resource Manager
         (management.azure.com)
```

### Updated Directory Layout

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                              ← Dashboard (subscription list)
│   ├── subscriptions/
│   │   └── [subscriptionId]/
│   │       └── page.tsx                      ← Resource diagram page
│   └── api/
│       └── subscriptions/
│           ├── route.ts                      ← GET subscriptions
│           └── [subscriptionId]/
│               └── resources/
│                   └── route.ts              ← GET resources + relationships
├── components/
│   ├── Dashboard.tsx
│   ├── SubscriptionList.tsx                  ← Rows become <Link> to diagram
│   ├── ResourceDiagram.tsx                   ← React Flow canvas (client)
│   └── ResourceNode.tsx                      ← Custom node component
├── hooks/
│   ├── useSubscriptions.ts
│   └── useResourceGraph.ts                   ← Fetch + transform for diagram
├── services/
│   ├── cache.ts
│   └── azure/
│       ├── subscriptions.ts
│       ├── resources.ts                      ← ResourceManagementClient wrapper
│       └── relationships.ts                  ← Relationship inference logic
└── types/
    └── azure.ts                              ← All shared types
```

### Implementation Order

1. **Lovell (Backend):** Install `@azure/arm-resources`, create `resources.ts` service,
   create `relationships.ts`, wire up API route with cache
2. **Swigert (Frontend):** Install `@xyflow/react` + `@dagrejs/dagre`, create
   `ResourceDiagram`, `ResourceNode`, `useResourceGraph`, add routing + link from
   `SubscriptionList`
3. **Haise (Testing):** Tests for resource service, relationship inference, API route,
   and diagram component

---

## Future (post-Phase 2)

- Dashboard charts: uptime, latency, usage per resource
- Azure MCP server integration for richer discovery
- Resource property inspection for deeper relationship mapping
- Azure Resource Graph queries for dependency data
- Metric cache with 5-minute background refresh
- WebSocket or SSE for live updates
- Resource group filtering / search in diagram
