import type { AzureSubscription } from "@/types/azure";

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
const mockListSubscriptions = jest.fn();

jest.mock("@/services/azure/subscriptions", () => ({
  listSubscriptions: (...args: unknown[]) => mockListSubscriptions(...args),
  AzureEnvError,
  AzureAuthError,
  AzureServiceError,
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { GET } from "@/app/api/subscriptions/route";

// ── Fixtures ─────────────────────────────────────────────
const fakeSubscriptions: AzureSubscription[] = [
  {
    id: "/subscriptions/aaa-111",
    subscriptionId: "aaa-111",
    displayName: "Dev Subscription",
    state: "Enabled",
    tenantId: "tenant-1",
  },
];

// ── Tests ────────────────────────────────────────────────
describe("GET /api/subscriptions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with subscriptions on success", async () => {
    mockListSubscriptions.mockResolvedValue(fakeSubscriptions);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ subscriptions: fakeSubscriptions });
  });

  it("returns 500 when the service throws a generic error", async () => {
    mockListSubscriptions.mockRejectedValue(new Error("Something broke"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to fetch subscriptions");
  });

  it("returns 500 when Azure env vars are missing", async () => {
    mockListSubscriptions.mockRejectedValue(
      new AzureEnvError("Missing AZURE_TENANT_ID")
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Azure credentials not configured");
  });

  it("response matches the SubscriptionsResponse contract", async () => {
    mockListSubscriptions.mockResolvedValue(fakeSubscriptions);

    const res = await GET();
    const body = await res.json();

    expect(body).toHaveProperty("subscriptions");
    expect(Array.isArray(body.subscriptions)).toBe(true);

    const sub = body.subscriptions[0];
    expect(sub).toHaveProperty("id");
    expect(sub).toHaveProperty("subscriptionId");
    expect(sub).toHaveProperty("displayName");
    expect(sub).toHaveProperty("state");
    expect(sub).toHaveProperty("tenantId");
  });
});
