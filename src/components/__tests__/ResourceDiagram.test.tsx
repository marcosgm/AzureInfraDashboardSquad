/**
 * ResourceDiagram component tests — Phase 2.
 *
 * Mocks React Flow, dagre, CSS imports, and the data-fetching hook
 * to test loading, error, success, and empty states in jsdom.
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";

// ── Mock CSS import ──────────────────────────────────────
jest.mock("@xyflow/react/dist/style.css", () => ({}));

// ── Mock React Flow ──────────────────────────────────────
jest.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes }: { nodes: { id: string; data: { label: string } }[] }) => (
    <div data-testid="react-flow">
      {(nodes ?? []).map((n) => (
        <div key={n.id} data-testid={`node-${n.id}`}>
          {n.data.label}
        </div>
      ))}
    </div>
  ),
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
  useNodesState: (initial: unknown[]) => [initial, jest.fn(), jest.fn()],
  useEdgesState: (initial: unknown[]) => [initial, jest.fn(), jest.fn()],
}));

// ── Mock dagre ───────────────────────────────────────────
jest.mock("@dagrejs/dagre", () => ({
  __esModule: true,
  default: {
    graphlib: {
      Graph: jest.fn().mockImplementation(() => ({
        setDefaultEdgeLabel: jest.fn(),
        setGraph: jest.fn(),
        setNode: jest.fn(),
        setEdge: jest.fn(),
        node: () => ({ x: 0, y: 0 }),
      })),
    },
    layout: jest.fn(),
  },
}));

// ── Mock ResourceNode ────────────────────────────────────
jest.mock("@/components/ResourceNode", () => ({
  __esModule: true,
  default: () => <div data-testid="resource-node" />,
}));

// ── Mock the data-fetching hook ──────────────────────────
const mockUseResourceGraph = jest.fn();
jest.mock("@/hooks/useResourceGraph", () => ({
  useResourceGraph: (...args: unknown[]) => mockUseResourceGraph(...args),
}));

import ResourceDiagram from "@/components/ResourceDiagram";

// ── Tests ────────────────────────────────────────────────
describe("ResourceDiagram", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders loading state", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: null,
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(<ResourceDiagram subscriptionId="sub-1" />);

    expect(screen.getByText(/loading resource diagram/i)).toBeInTheDocument();
  });

  it("renders error state with retry button", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: null,
      loading: false,
      error: "Azure service unavailable",
      refresh: jest.fn(),
    });

    render(<ResourceDiagram subscriptionId="sub-1" />);

    expect(screen.getByText(/failed to load resources/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders empty state when graph has no nodes", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: { nodes: [], edges: [] },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<ResourceDiagram subscriptionId="sub-1" />);

    expect(screen.getByText(/no resources found/i)).toBeInTheDocument();
  });

  it("renders React Flow canvas for non-empty graph", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: {
        nodes: [
          {
            id: "/sub/rg/vm1",
            name: "myVM",
            type: "Microsoft.Compute/virtualMachines",
            resourceGroup: "my-rg",
            location: "eastus",
          },
        ],
        edges: [],
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<ResourceDiagram subscriptionId="sub-1" />);

    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });
});
