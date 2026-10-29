function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" aria-label="Loading Pasuyo" role="status">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <Skeleton className="hidden h-5 w-24 sm:block" />
          </div>
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-7xl gap-5 px-4 py-3 sm:px-6 lg:px-8">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-3 h-9 w-72" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["one", "two", "three", "four"].map((card) => <Skeleton key={card} className="h-32 rounded-3xl" />)}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </main>
    </div>
  );
}
