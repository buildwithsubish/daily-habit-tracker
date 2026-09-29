'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Grid2X2, List, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Preset {
  _id: string;
  name: string;
  description?: string;
  type: string;
  category?: string;
  habitsCount: number;
  structure?: { habits?: unknown[] };
}

export default function AdminPresetsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, isFetching, refetch } = useQuery<{ presets: Preset[] }>({
    queryKey: ['admin-presets'],
    queryFn: async () => {
      const response = await fetch('/api/presets-templates', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load preset templates');
      return response.json();
    },
  });

  const presets = data?.presets || [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return presets;
    return presets.filter(preset => [preset.name, preset.type, preset.category || '', preset.description || ''].some(value => value.toLocaleLowerCase().includes(term)));
  }, [presets, search]);

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'habit-presets.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return <main className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-700">Library</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Habit presets</h1><p className="mt-2 text-sm text-slate-600">Read-only templates currently available to users.</p></div><div className="flex w-full gap-2 sm:w-auto"><button onClick={exportPresets} disabled={!filtered.length} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"><Download size={16}/>Export JSON</button><button onClick={() => void refetch()} disabled={isFetching} className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-800 disabled:opacity-50" aria-label="Refresh presets"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/></button></div></header>

    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <label className="relative block w-full sm:max-w-md"><span className="sr-only">Search presets</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><Input placeholder="Search templates…" value={search} onChange={event => setSearch(event.target.value)} className="h-11 pl-10"/></label>
      <div className="flex items-center gap-1 self-end rounded-xl bg-slate-100 p-1 sm:self-auto" role="group" aria-label="Preset display mode"><button type="button" onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'} className={`flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${view === 'grid' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Grid2X2 size={18}/></button><button type="button" onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'} className={`flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${view === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><List size={18}/></button></div>
    </section>

    {isLoading ? <section className={`grid gap-3 ${view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`} aria-label="Loading presets">{[1, 2, 3].map(item => <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-200"/>)}</section> : null}

    {isError ? <section className="rounded-2xl border border-rose-200 bg-white p-6" role="alert"><h2 className="text-base font-semibold text-slate-950">Preset templates could not be loaded</h2><p className="mt-1 text-sm text-slate-600">Check your connection and try again.</p><button onClick={() => void refetch()} disabled={isFetching} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/>{isFetching ? 'Retrying…' : 'Try again'}</button></section> : null}

    {!isLoading && !isError && filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Search size={19}/></div><h2 className="mt-3 text-sm font-semibold text-slate-900">{presets.length ? 'No matching presets' : 'No presets available'}</h2><p className="mt-1 text-sm text-slate-600">{presets.length ? 'Try another search term.' : 'Templates will appear here when they are configured.'}</p>{search && <button onClick={() => setSearch('')} className="mt-4 inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Clear search</button>}</section> : null}

    {!isLoading && !isError && filtered.length > 0 ? <section className={`grid gap-3 ${view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`} aria-label="Preset templates">{filtered.map(preset => <Card key={preset._id} className="min-w-0 overflow-hidden"><CardHeader className="flex flex-row items-start justify-between gap-3 p-4 sm:p-5"><div className="min-w-0"><CardTitle className="truncate text-base font-semibold">{preset.name}</CardTitle>{preset.category && <p className="mt-1 truncate text-xs text-slate-500">{preset.category}</p>}</div><Badge variant="secondary" className="shrink-0 capitalize">{preset.type.replaceAll('-', ' ')}</Badge></CardHeader><CardContent className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5"><p className="min-h-10 text-sm leading-relaxed text-slate-600">{preset.description || 'A ready-made collection of habit ideas.'}</p><div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm font-medium text-slate-700"><CheckCircle2 size={16} className="text-teal-700"/>{preset.habitsCount ?? preset.structure?.habits?.length ?? 0} habits</div></CardContent></Card>)}</section> : null}
  </main>;
}
