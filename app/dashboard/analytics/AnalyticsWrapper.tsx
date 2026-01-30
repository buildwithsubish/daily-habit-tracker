'use client';

import dynamic from 'next/dynamic';

const AnalyticsClient = dynamic(() => import('./AnalyticsClient'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-black tracking-[0.3em] text-xs uppercase">
        Initializing Analytics Engine...
      </p>
    </div>
  ),
});

export default function AnalyticsWrapper() {
  return <AnalyticsClient />;
}
