import type { AzureSubscription } from "@/types/azure";

interface SummaryBarProps {
  subscriptions: AzureSubscription[];
  lastFetched: Date | null;
  nextRefreshIn: number;
  refreshing: boolean;
  onRefresh: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SummaryBar({
  subscriptions,
  lastFetched,
  nextRefreshIn,
  refreshing,
  onRefresh,
}: SummaryBarProps) {
  const total = subscriptions.length;
  const enabled = subscriptions.filter((s) => s.state === "Enabled").length;
  const other = total - enabled;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Stat cards */}
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total" value={total} color="text-slate-700" bg="bg-slate-50" />
          <StatCard label="Enabled" value={enabled} color="text-emerald-700" bg="bg-emerald-50" />
          <StatCard label="Disabled / Other" value={other} color="text-amber-700" bg="bg-amber-50" />
        </div>

        {/* Refresh controls */}
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500">
            {lastFetched && (
              <p>
                Last updated:{" "}
                <span className="font-medium text-slate-700">{formatTime(lastFetched)}</span>
              </p>
            )}
            <p className="flex items-center justify-end gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
              Auto-refresh in {formatCountdown(nextRefreshIn)}
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
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
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-md ${bg} px-4 py-2`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
