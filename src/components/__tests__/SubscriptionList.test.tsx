import { render, screen } from "@testing-library/react";
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
  it("renders subscription data in a table", () => {
    render(<SubscriptionList subscriptions={fakeSubscriptions} />);

    expect(screen.getByText("Dev Subscription")).toBeInTheDocument();
    expect(screen.getByText("Prod Subscription")).toBeInTheDocument();
    expect(screen.getByText("aaa-111")).toBeInTheDocument();
    expect(screen.getByText("bbb-222")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<SubscriptionList subscriptions={fakeSubscriptions} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Subscription ID")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
  });

  it("renders empty state when no subscriptions", () => {
    render(<SubscriptionList subscriptions={[]} />);

    expect(screen.getByText("No subscriptions found")).toBeInTheDocument();
  });

  it("applies correct badge style for Enabled state", () => {
    render(<SubscriptionList subscriptions={[fakeSubscriptions[0]]} />);

    const badge = screen.getByText("Enabled");
    expect(badge.className).toContain("bg-emerald-100");
  });

  it("applies correct badge style for Disabled state", () => {
    render(<SubscriptionList subscriptions={[fakeSubscriptions[1]]} />);

    const badge = screen.getByText("Disabled");
    expect(badge.className).toContain("bg-red-100");
  });
});
