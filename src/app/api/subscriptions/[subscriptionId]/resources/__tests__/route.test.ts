import type { AzureResource, ResourceRelationship } from "@/types/azure";

// ── Error classes (must be real classes for instanceof checks) ────
class AzureEnvError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "AzureEnvError";
  }
}

class AzureAuthError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "AzureAuthError";
  }
}

class AzureServiceError extends Error {
  public statusCode?: number;
  constructor(msg: string, statusCode?: number) {
    super(msg);
    this.name = "AzureServiceError";
    this.statusCode = statusCode;
  }
}

// ── Mocks ────────────────────────────────────────────────
const mockListResources = jest.fn();
const mockDiscoverRelationships = jest.fn();

jest.mock("@/services/azure/resources", () => ({
  listResources: (...args: unknown[]) => mockListResources(...args),
}));

jest.mock("@/services/azure/relationships", () => ({
  discoverRelationships: (...args: unknown[]) => mockDiscoverRelationships(...args),
}));

jest.mock("@/services/azure/subscriptions", () => ({
  AzureAuthError,
  AzureServiceError,
}));

jest.mock("@/services/azure/env", () => ({
  AzureEnvError,
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { GET } from "@/app/api/subscriptions/[subscriptionId]/resources/route";

// ── Fixtures ─────────────────────────────────────────────
const SUB_ID = "sub-aaa-111";

const fakeNodes: AzureResource[] = [
  {
    id: `/subscriptions/${SUB_ID}/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/myVM`,
    name: "myVM",
    type: "Microsoft.Compute/virtualMachines",
    resourceGroup: "my-rg",
    location: "eastus",
  },
];

const fakeEdges: ResourceRelationship[] = [
  {
    sourceId: fakeNodes[0].id,
    targetId: `/subscriptions/${SUB_ID}/resourceGroups/my-rg/providers/Microsoft.Network/networkInterfaces/myVM-nic`,
    type: "uses",
  },
];

// Helper to build the params object passed by Next.js
function makeRequest() {
  return [
    new Request("http://localhost/api/subscriptions/" + SUB_ID + "/resources"),
    { params: { subscriptionId: SUB_ID } },
  ] as const;
}

// ── Tests ────────────────────────────────────────────────
describe("GET /api/subscriptions/[subscriptionId]/resources", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with resource graph on success", async () => {
    mockListResources.mockResolvedValue(fakeNodes);
    mockDiscoverRelationships.mockReturnValue(fakeEdges);

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      subscriptionId: SUB_ID,
      graph: { nodes: fakeNodes, edges: fakeEdges },
    });
  });

  it("passes subscriptionId to listResources", async () => {
    mockListResources.mockResolvedValue([]);
    mockDiscoverRelationships.mockReturnValue([]);

    await GET(...makeRequest());

    expect(mockListResources).toHaveBeenCalledWith(SUB_ID);
  });

  it("returns 401 on AzureAuthError", async () => {
    mockListResources.mockRejectedValue(
      new AzureAuthError("Credentials rejected")
    );

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Azure authentication failed");
  });

  it("returns 429 on AzureServiceError with rate limit", async () => {
    mockListResources.mockRejectedValue(
      new AzureServiceError("Rate limited", 429)
    );

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("Azure service unavailable");
  });

  it("returns 503 on AzureServiceError without rate limit", async () => {
    mockListResources.mockRejectedValue(
      new AzureServiceError("Azure is down", 500)
    );

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("Azure service unavailable");
  });

  it("returns 500 on AzureEnvError", async () => {
    mockListResources.mockRejectedValue(
      new AzureEnvError("Missing AZURE_TENANT_ID")
    );

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Azure credentials not configured");
  });

  it("returns 500 on unknown error", async () => {
    mockListResources.mockRejectedValue(new Error("Something broke"));

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch resources");
  });

  it("response matches ResourceGraphResponse contract", async () => {
    mockListResources.mockResolvedValue(fakeNodes);
    mockDiscoverRelationships.mockReturnValue(fakeEdges);

    const res = await GET(...makeRequest());
    const body = await res.json();

    expect(body).toHaveProperty("subscriptionId");
    expect(body).toHaveProperty("graph");
    expect(body.graph).toHaveProperty("nodes");
    expect(body.graph).toHaveProperty("edges");
    expect(Array.isArray(body.graph.nodes)).toBe(true);
    expect(Array.isArray(body.graph.edges)).toBe(true);
  });
});
