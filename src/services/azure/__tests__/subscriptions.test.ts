import type { AzureSubscription } from "@/types/azure";

// ── Mocks ────────────────────────────────────────────────
const mockList = jest.fn();

jest.mock("@azure/identity", () => ({
  DefaultAzureCredential: jest.fn(),
}));

jest.mock("@azure/arm-resources-subscriptions", () => ({
  SubscriptionClient: jest.fn().mockImplementation(() => ({
    subscriptions: {
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

import { listSubscriptions } from "@/services/azure/subscriptions";
import cache from "@/services/cache";
import { validateAzureEnv } from "@/services/azure/env";

// ── Fixtures ─────────────────────────────────────────────
const fakeSubscriptions: AzureSubscription[] = [
  {
    id: "/subscriptions/aaa-111",
    subscriptionId: "aaa-111",
    displayName: "Dev Subscription",
    state: "Enabled",
    tenantId: "tenant-1",
  },
  {
    id: "/subscriptions/bbb-222",
    subscriptionId: "bbb-222",
    displayName: "Prod Subscription",
    state: "Enabled",
    tenantId: "tenant-1",
  },
];

// Helper: make mockList return an async iterable
function setMockSubscriptions(subs: AzureSubscription[]) {
  mockList.mockReturnValue(
    (async function* () {
      for (const s of subs) yield s;
    })()
  );
}

// ── Tests ────────────────────────────────────────────────
describe("listSubscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.flushAll();
  });

  it("returns subscriptions from Azure on first call", async () => {
    setMockSubscriptions(fakeSubscriptions);

    const result = await listSubscriptions();

    expect(result).toEqual(fakeSubscriptions);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("caches results after the first call", async () => {
    setMockSubscriptions(fakeSubscriptions);

    await listSubscriptions();

    expect(cache.get("azure:subscriptions")).toEqual(fakeSubscriptions);
  });

  it("returns cached results on subsequent calls without hitting Azure", async () => {
    setMockSubscriptions(fakeSubscriptions);

    const first = await listSubscriptions();

    // Reset the mock iterable for second call (it would be exhausted)
    setMockSubscriptions(fakeSubscriptions);

    const second = await listSubscriptions();

    expect(first).toEqual(second);
    // Should only have called list() once — second call uses cache
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("throws AzureAuthError when Azure credential creation fails", async () => {
    const { DefaultAzureCredential } = require("@azure/identity");
    DefaultAzureCredential.mockImplementation(() => {
      throw new Error("Authentication failed");
    });

    await expect(listSubscriptions()).rejects.toThrow("Authentication failed");
  });

  it("throws AzureServiceError when Azure API is unreachable", async () => {
    const { RestError } = require("@azure/core-rest-pipeline");
    mockList.mockReturnValue(
      (async function* () {
        throw new RestError("ECONNREFUSED", { statusCode: 500 });
      })()
    );

    await expect(listSubscriptions()).rejects.toThrow(/Azure/);
  });
});
