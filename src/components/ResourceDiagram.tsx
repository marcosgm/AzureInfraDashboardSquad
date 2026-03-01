"use client";

import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useEffect, useMemo } from "react";
import { useResourceGraph } from "@/hooks/useResourceGraph";
import ResourceNode from "@/components/ResourceNode";
import type { ResourceGraph } from "@/types/azure";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 70;

function applyDagreLayout(graph: ResourceGraph): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  graph.nodes.forEach((resource) => {
    g.setNode(resource.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  graph.edges.forEach((rel) => {
    g.setEdge(rel.sourceId, rel.targetId);
  });

  dagre.layout(g);

  const nodes: Node[] = graph.nodes.map((resource) => {
    const pos = g.node(resource.id);
    return {
      id: resource.id,
      type: "resourceNode",
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        label: resource.name,
        resourceType: resource.type,
        resourceGroup: resource.resourceGroup,
      },
    };
  });

  const edges: Edge[] = graph.edges.map((rel, i) => ({
    id: `e-${i}`,
    source: rel.sourceId,
    target: rel.targetId,
    label: rel.type,
    style: { stroke: "#64748b" },
    labelStyle: { fill: "#94a3b8", fontSize: 10 },
    animated: true,
  }));

  return { nodes, edges };
}

const nodeTypes = { resourceNode: ResourceNode };

interface ResourceDiagramProps {
  subscriptionId: string;
}

export default function ResourceDiagram({ subscriptionId }: ResourceDiagramProps) {
  const { graph, loading, error, refresh } = useResourceGraph(subscriptionId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!graph) return;
    const layout = applyDagreLayout(graph);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [graph, setNodes, setEdges]);

  const defaultEdgeOptions = useMemo(
    () => ({ style: { stroke: "#64748b", strokeWidth: 1.5 } }),
    []
  );

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="mt-3 text-sm text-slate-500">Loading resource diagram…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-800">Failed to load resources</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-800">No resources found</p>
          <p className="mt-1 text-sm text-amber-600">
            This subscription has no discoverable resources.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={20} />
        <Controls
          className="!border-slate-600 !bg-slate-800 [&>button]:!border-slate-600 [&>button]:!bg-slate-800 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700"
        />
      </ReactFlow>
    </div>
  );
}
