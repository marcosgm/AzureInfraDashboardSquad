"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResourceGraph } from "@/types/azure";

export interface UseResourceGraphResult {
  graph: ResourceGraph | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useResourceGraph(subscriptionId: string): UseResourceGraphResult {
  const [graph, setGraph] = useState<ResourceGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/resources`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to fetch resources");
      }
      const data = await res.json();
      setGraph(data.graph);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  const refresh = useCallback(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graph, loading, error, refresh };
}
