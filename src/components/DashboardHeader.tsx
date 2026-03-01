export default function DashboardHeader() {
  return (
    <header className="border-b border-slate-700 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Azure-style icon */}
          <svg
            className="h-7 w-7 text-sky-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Azure Infrastructure Visualizer
            </h1>
            <p className="text-xs text-slate-400">Real-time infrastructure dashboard</p>
          </div>
        </div>
        <span className="hidden rounded bg-sky-900/50 px-2 py-1 text-xs text-sky-300 sm:inline-block">
          MVP
        </span>
      </div>
    </header>
  );
}
