export default function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Header skeleton */}
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="flex gap-6">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div className="hidden h-3 w-36 animate-pulse rounded bg-slate-200 lg:block" />
        </div>
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-6 border-b border-slate-100 px-6 py-4 last:border-b-0"
        >
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-52 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          <div className="hidden h-4 w-44 animate-pulse rounded bg-slate-100 lg:block" />
        </div>
      ))}
    </div>
  );
}
