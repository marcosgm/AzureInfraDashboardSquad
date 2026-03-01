import type { AzureResource } from "@/types/azure";

// ── Mocks ────────────────────────────────────────────────
const mockList = jest.fn();

jest.mock("@azure/identity", () => ({
  DefaultAzureCredential: jest.fn(),
}));

jest.mock("@azure/arm-resources", () => ({
  ResourceManagementClient: jest.fn().mockImplementation(() => ({
    resources: {
      list: mockList,
    },
  })),
}));

jest.mock("@azure/core-rest-pipeline", () => ({
  RestError: class RestError extends Error {
    statusCode?: number;
    constructor(message: string, opts?: { statusCode?: number }) {
      super(message);
      this.name = "RestError";
      this.statusCode = opts?.statusCode;
    }
  },
}));

// Use a real NodeCache but reset between tests
jest.mock("@/services/cache", () => {
  const NodeCache = require("node-cache");
  return {
    __esModule: true,
    default: new NodeCache({ stdTTL: 300, checkperiod: 0 }),
  };
});

// Mock env validation to pass by default
jest.mock("@/services/azure/env", () => ({
  AzureEnvError: class AzureEnvError extends Error {
    constructor(missing: string[]) {
      super(`Missing required Azure environment variables: ${missing.join(", ")}.`);
      this.name = "AzureEnvError";
    }
  },
  validateAzureEnv: jest.fn(),
}));

import { listResources } from "@/services/azure/resources";
import { AzureAuthError, AzureServiceError } from "@/services/azure/subscriptions";
import cache from "@/services/cache";

// ── Fixtures ─────────────────────────────────────────────
const SUB_ID = "sub-aaa-111";

const fakeResources: AzureResource[] = [
  {
    id: `/subscriptions/${SUB_ID}/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/myVM`,
    name: "myVM",
    type: "Microsoft.Compute/virtualMachines",
    resourceGroup: "my-rg",
    location: "eastus",
  },
  {
    id: `/subscriptions/${SUB_ID}/resourceGroups/my-rg/providers/Microsoft.Network/networkInterfaces/myVM-nic`,
    name: "myVM-nic",
    type: "Microsoft.Network/networkInterfaces",
    resourceGroup: "my-rg",
    location: "eastus",
  },
];

// Raw SDK resources (no resourceGroup field — parsed from id)
const fakeSDKResources = fakeResources.map((r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  location: r.location,
}));

// Helper: make mockList return an async iterable
function setMockResources(resources: typeof fakeSDKResources) {
  mockList.mockReturnValue(
    (async function* () {
      for (const r of resources) yield r;
    })()
  );
}

// ── Tests ────────────────────────────────────────────────
describe("listResources", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.flushAll();
  });

  it("returns resources from Azure on first call", async () => {
    setMockResources(fakeSDKResources);

    const result = await listResources(SUB_ID);

    expect(result).toEqual(fakeResources);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("parses resourceGroup from resource ID", async () => {
    setMockResources([
      {
        id: `/subscriptions/${SUB_ID}/resourceGroups/prod-rg/providers/Microsoft.Storage/storageAccounts/sa1`,
        name: "sa1",
        type: "Microsoft.Storage/storageAccounts",
        location: "westus",
      },
    ]);

    const result = await listResources(SUB_ID);

    expect(result[0].resourceGroup).toBe("prod-rg");
  });

  it("defaults resourceGroup to 'unknown' for malformed ID", async () => {
    setMockResources([
      {
        id: "/some/weird/path/without/rg",
        name: "orphan",
        type: "Microsoft.Unknown/thing",
        location: "nowhere",
      },
    ]);

    const result = await listResources(SUB_ID);

    expect(result[0].resourceGroup).toBe("unknown");
  });

  it("caches results keyed by subscriptionId", async () => {
    setMockResources(fakeSDKResources);

    await listResources(SUB_ID);

    expect(cache.get(`azure:resources:${SUB_ID}`)).toEqual(fakeResources);
  });

  it("returns cached results without hitting Azure on second call", async () => {
    setMockResources(fakeSDKResources);
    await listResources(SUB_ID);

    setMockResources(fakeSDKResources);
    const second = await listResources(SUB_ID);

    expect(second).toEqual(fakeResources);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("throws AzureAuthError when credential creation fails", async () => {
    const { DefaultAzureCredential } = require("@azure/identity");
    DefaultAzureCredential.mockImplementation(() => {
      throw new Error("Authentication failed");
    });

    await expect(listResources(SUB_ID)).rejects.toThrow(AzureAuthError);
  });

  it("throws AzureServiceError with 429 on rate limit", async () => {
    // Ensure credential mock is reset (previous test may have overridden it)
    const { DefaultAzureCredential } = require("@azure/identity");
    DefaultAzureCredential.mockImplementation(() => ({}));

    const { RestError } = require("@azure/core-rest-pipeline");
    mockList.mockReturnValue(
      (async function* () {
        throw new RestError("Rate limited", { statusCode: 429 });
      })()
    );

    const promise = listResources(SUB_ID);
    await expect(promise).rejects.toThrow(AzureServiceError);
    await expect(promise).rejects.toThrow(/rate limit/i);
  });
});
