"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AzureSubscription } from "@/types/azure";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface UseSubscriptionsResult {
  subscriptions: AzureSubscription[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refreshing: boolean;
  refresh: () => void;
  nextRefreshIn: number; // seconds until next auto-refresh
}

export function useSubscriptions(): UseSubscriptionsResult {
  const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL_MS / 1000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSubscriptions = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Request failed");
      }
      const data = await res.json();
      setSubscriptions(data.subscriptions);
      setLastFetched(new Date());
      setNextRefreshIn(REFRESH_INTERVAL_MS / 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchSubscriptions(true);
  }, [fetchSubscriptions]);

  // Initial fetch + auto-refresh interval
  useEffect(() => {
    fetchSubscriptions(false);
    intervalRef.current = setInterval(() => fetchSubscriptions(true), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSubscriptions]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setNextRefreshIn((prev) => (prev <= 1 ? REFRESH_INTERVAL_MS / 1000 : prev - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return { subscriptions, loading, error, lastFetched, refreshing, refresh, nextRefreshIn };
}
