export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

export function SkeletonOrderCard() {
  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-5 w-16" />
      </div>
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, columns = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 sm:px-6 py-4">
              <SkeletonBlock className="h-4 w-full max-w-[160px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonList({ rows = 3, rowClassName = 'h-16' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className={`w-full ${rowClassName}`} />
      ))}
    </div>
  );
}

export function SkeletonOrderDetail() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <SkeletonBlock className="h-11 w-36" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonKanban({ columns = 6, cardsPerColumn = 2 }) {
  return (
    <div className="flex xl:grid xl:grid-cols-6 gap-4 overflow-x-auto pb-2">
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="min-w-[82vw] sm:min-w-[300px] xl:min-w-0 shrink-0 xl:shrink space-y-3">
          <SkeletonBlock className="h-5 w-2/3" />
          {Array.from({ length: cardsPerColumn }).map((_, cardIndex) => (
            <SkeletonOrderCard key={cardIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}
