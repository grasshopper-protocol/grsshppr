export default function ExploreLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-52 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-border bg-muted/50"
          />
        ))}
      </div>
    </div>
  );
}
