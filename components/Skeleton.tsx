'use client';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg ${className}`} />
);

export const HabitSkeleton = () => (
  <div className="card flex items-center gap-3 !py-3 !px-4">
    <Skeleton className="w-5 h-5 !rounded-full" />
    <Skeleton className="w-8 h-8 !rounded-lg" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="card flex items-start gap-3">
        <Skeleton className="w-9 h-9 !rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="card">
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
    <Skeleton className="h-[280px] w-full" />
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="space-y-8">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-24 !rounded-md" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16 !rounded-lg" />
        <Skeleton className="h-9 w-16 !rounded-lg" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card">
          <Skeleton className="w-10 h-10 !rounded-lg mb-4" />
          <Skeleton className="h-8 w-20 mb-1.5" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>

    <div className="responsive-grid-tablet">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-[260px] w-full" />
      </div>
      <div className="space-y-4">
        <div className="card bg-indigo-600 !border-indigo-600">
          <Skeleton className="h-5 w-24 mb-6 !bg-indigo-500" />
          <Skeleton className="h-16 w-full mb-4 !bg-indigo-500" />
          <Skeleton className="h-12 w-full !bg-indigo-500" />
        </div>
        <div className="card">
          <Skeleton className="h-5 w-24 mb-5" />
          <Skeleton className="w-36 h-36 !rounded-full mx-auto mb-5" />
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const AchievementSkeleton = () => (
  <div className="card-premium p-5 opacity-50">
    <div className="flex justify-between items-start mb-4">
      <Skeleton className="w-12 h-12 !rounded-2xl" />
      <Skeleton className="h-4 w-12 !rounded-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
    </div>
    <div className="mt-6 flex justify-between">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-10 !rounded-lg" />
    </div>
  </div>
);
