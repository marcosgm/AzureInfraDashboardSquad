import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SubscriptionList from "@/components/SubscriptionList";
import type { AzureSubscription } from "@/types/azure";

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
    state: "Disabled",
    tenantId: "tenant-1",
  },
];

// ── Tests ────────────────────────────────────────────────
describe("SubscriptionList", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("renders loading state initially", () => {
    // fetch that never resolves → component stays in loading
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

    render(<SubscriptionList />);

    expect(screen.getByText("Loading subscriptions…")).toBeInTheDocument();
  });

  it("renders subscription data in a table", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: fakeSubscriptions }),
    });

    render(<SubscriptionList />);

    await waitFor(() => {
      expect(screen.getByText("Dev Subscription")).toBeInTheDocument();
    });

    expect(screen.getByText("Prod Subscription")).toBeInTheDocument();
    expect(screen.getByText("aaa-111")).toBeInTheDocument();
    expect(screen.getByText("bbb-222")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders error state with error message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed to fetch subscriptions" }),
    });

    render(<SubscriptionList />);

    await waitFor(() => {
      expect(
        screen.getByText("Error: Failed to fetch subscriptions")
      ).toBeInTheDocument();
    });
  });

  it("renders empty state when no subscriptions", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ subscriptions: [] }),
    });

    render(<SubscriptionList />);

    await waitFor(() => {
      expect(screen.getByText("No subscriptions found.")).toBeInTheDocument();
    });
  });
});
