'use client';

import { motion } from 'framer-motion';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-slate-200 dark:bg-zinc-800 animate-pulse rounded-xl ${className}`} />
);

export const HabitSkeleton = () => (
  <div className="modern-card flex items-center gap-4 py-4 px-5">
    <Skeleton className="w-12 h-12 rounded-2xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="w-8 h-8 rounded-full" />
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="modern-card p-5">
        <Skeleton className="w-10 h-10 rounded-xl mb-3" />
        <Skeleton className="h-7 w-2/3 mb-1" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="modern-card p-6 lg:p-8">
    <div className="flex justify-between items-center mb-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
    <Skeleton className="h-[300px] w-full rounded-2xl" />
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 space-y-12">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
      <div className="space-y-4">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-14 w-80" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-12 w-20 rounded-xl" />
        <Skeleton className="h-12 w-20 rounded-xl" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-3xl p-6 bg-zinc-100 dark:bg-zinc-800/50">
          <Skeleton className="w-14 h-14 rounded-2xl mb-5" />
          <Skeleton className="h-10 w-24 mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-[320px] w-full rounded-2xl" />
      </div>
      <div className="space-y-6">
        <div className="rounded-3xl bg-indigo-600 p-6">
          <Skeleton className="h-6 w-32 mb-8" />
          <Skeleton className="h-20 w-full rounded-xl mb-6" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 p-6">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="w-48 h-48 rounded-full mx-auto mb-6" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
