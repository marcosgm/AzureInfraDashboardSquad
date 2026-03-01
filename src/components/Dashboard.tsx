"use client";

import { useSubscriptions } from "@/hooks/useSubscriptions";
import SummaryBar from "@/components/SummaryBar";
import SubscriptionList from "@/components/SubscriptionList";
import SkeletonTable from "@/components/SkeletonTable";

export default function Dashboard() {
  const {
    subscriptions,
    loading,
    error,
    lastFetched,
    refreshing,
    refresh,
    nextRefreshIn,
  } = useSubscriptions();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Subscriptions</h2>
        <p className="text-sm text-slate-500">
          Azure subscriptions available to your service principal.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {/* Summary skeleton */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-md bg-slate-50 px-4 py-2">
                  <div className="mb-1 h-3 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 w-10 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
          <SkeletonTable rows={5} />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <svg
            className="mx-auto mb-3 h-10 w-10 text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="font-medium text-red-800">Failed to load subscriptions</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Retry
          </button>
        </div>
      )}

      {/* Success state */}
      {!loading && !error && (
        <div className="space-y-4">
          <SummaryBar
            subscriptions={subscriptions}
            lastFetched={lastFetched}
            nextRefreshIn={nextRefreshIn}
            refreshing={refreshing}
            onRefresh={refresh}
          />
          <SubscriptionList subscriptions={subscriptions} />
        </div>
      )}
    </main>
  );
}
