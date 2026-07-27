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
