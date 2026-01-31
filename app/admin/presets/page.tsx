"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, Search, Grid, List as ListIcon, 
  GripVertical, MoreVertical, Edit, Trash2,
  ExternalLink, Download, Upload, Zap,
  BarChart, CheckCircle2, Clock
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Preset {
  _id: string;
  type: 'weekday' | 'gym' | 'diet';
  name: string;
  structure: { habits: any[] };
  usageCount: number;
}

export default function AdminPresetsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  
  const { data: presets = [], isLoading } = useQuery<Preset[]>({
    queryKey: ['admin-presets'],
    queryFn: async () => {
      const res = await fetch('/api/presets');
      const data = await res.json();
      return data.presets || [];
    }
  });

  const [items, setItems] = useState<Preset[]>([]);

  // Update items when presets are loaded or search changes
  React.useEffect(() => {
    if (presets.length > 0) {
      setItems(presets.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase())
      ));
    }
  }, [presets, search]);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "presets_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Presets exported successfully');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Preset Templates</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Configure global habit bundles for user onboarding</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} className="font-bold border-slate-200">
             <Download size={16} className="mr-2" /> Export
          </Button>
          <Button variant="outline" className="font-bold border-slate-200">
             <Upload size={16} className="mr-2" /> Import
          </Button>
          <Button className="font-bold shadow-indigo-600/20 shadow-lg">
             <Plus size={16} className="mr-2" /> New Preset
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search templates..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setView('grid')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Grid size={18} />
          </button>
          <button 
             onClick={() => setView('list')}
             className={cn(
              "p-1.5 rounded-md transition-all",
              view === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-xl"></div>)}
        </div>
      ) : (
        <Reorder.Group 
          axis="y" 
          values={items} 
          onReorder={setItems}
          className={cn(
            view === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-4"
          )}
        >
          {items.map((preset) => (
            <Reorder.Item 
              key={preset._id} 
              value={preset}
              className="list-none"
            >
              <Card className="group hover:border-indigo-600 transition-all cursor-move">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400" />
                    <CardTitle className="text-lg font-bold">{preset.name}</CardTitle>
                  </div>
                  <Badge className={cn(
                    "uppercase text-[10px] font-black",
                    preset.type === 'gym' ? "bg-orange-500" : 
                    preset.type === 'diet' ? "bg-emerald-500" : "bg-blue-500"
                  )}>
                    {preset.type}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                       <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Usage</p>
                       <div className="flex items-center gap-2">
                          <BarChart size={14} className="text-indigo-500" />
                          <span className="text-sm font-black text-slate-900">{preset.usageCount} users</span>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Habits</p>
                       <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-sm font-black text-slate-900">{preset.structure.habits.length} items</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Heatmap Preview Placeholder */}
                  <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full flex gap-0.5 overflow-hidden">
                     {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className={cn(
                          "h-full flex-1",
                          Math.random() > 0.5 ? "bg-indigo-500" : "bg-slate-200"
                        )}></div>
                     ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                   <div className="flex -space-x-1.5">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100"></div>
                      ))}
                      <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[8px] font-bold text-slate-400">+12</div>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                         <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                         <Trash2 size={16} />
                      </Button>
                   </div>
                </CardFooter>
              </Card>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

import * as React from 'react';
