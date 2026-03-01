/**
 * ResourceDiagram component tests — written against the Phase 2 design spec.
 *
 * These tests are SKIPPED until the component and its hook are implemented
 * by Swigert. They define the expected contract:
 *   - Loading state renders a skeleton/spinner
 *   - Error state renders an error message
 *   - Success state renders React Flow nodes for each resource
 *   - Empty graph renders an empty-state message
 *
 * Once ResourceDiagram.tsx and useResourceGraph.ts exist, remove .skip
 * and adjust selectors/text as needed.
 */
import "@testing-library/jest-dom";

// ── Mock React Flow before any component import ──────────
jest.mock("@xyflow/react", () => ({
  ReactFlow: ({ nodes, edges }: { nodes: unknown[]; edges: unknown[] }) => (
    <div data-testid="react-flow">
      {(nodes as { id: string; data: { label: string } }[]).map((n) => (
        <div key={n.id} data-testid={`node-${n.id}`}>
          {n.data.label}
        </div>
      ))}
    </div>
  ),
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  useNodesState: (initial: unknown[]) => [initial, jest.fn()],
  useEdgesState: (initial: unknown[]) => [initial, jest.fn()],
  Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
}));

// ── Mock the data-fetching hook ──────────────────────────
const mockUseResourceGraph = jest.fn();
jest.mock("@/hooks/useResourceGraph", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseResourceGraph(...args),
}));

// Conditional skip: only run these tests when the component exists
let ResourceDiagram: React.ComponentType<{ subscriptionId: string }> | null = null;
let componentExists = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ResourceDiagram = require("@/components/ResourceDiagram").default;
  componentExists = true;
} catch {
  componentExists = false;
}

import { render, screen } from "@testing-library/react";

// ── Tests ────────────────────────────────────────────────
const describeIf = componentExists ? describe : describe.skip;

describeIf("ResourceDiagram", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders loading state", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: null,
      loading: true,
      error: null,
    });

    render(<ResourceDiagram! subscriptionId="sub-1" />);

    // Expect some loading indicator (skeleton, spinner, or text)
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: null,
      loading: false,
      error: "Failed to load resources",
    });

    render(<ResourceDiagram! subscriptionId="sub-1" />);

    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it("renders React Flow canvas with resource nodes", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: {
        nodes: [
          {
            id: "vm-1",
            data: { label: "myVM" },
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
      loading: false,
      error: null,
    });

    render(<ResourceDiagram! subscriptionId="sub-1" />);

    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    expect(screen.getByText("myVM")).toBeInTheDocument();
  });

  it("renders empty state when graph has no nodes", () => {
    mockUseResourceGraph.mockReturnValue({
      graph: { nodes: [], edges: [] },
      loading: false,
      error: null,
    });

    render(<ResourceDiagram! subscriptionId="sub-1" />);

    expect(screen.getByText(/no resources/i)).toBeInTheDocument();
  });
});
