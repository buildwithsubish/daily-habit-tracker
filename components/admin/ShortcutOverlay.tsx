"use client";

import { useState } from 'react';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin-store';
import { useRouter } from 'next/navigation';

export function ShortcutOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const { toggleSidebar } = useAdminStore();
  const router = useRouter();

  useShortcuts([
    { key: '?', action: () => setIsOpen(true) },
    { key: 'Escape', action: () => setIsOpen(false) },
    { key: 'b', ctrl: true, action: () => toggleSidebar() },
    { key: 'd', ctrl: true, action: () => router.push('/admin/dashboard') },
    { key: 'u', ctrl: true, action: () => router.push('/admin/users') },
  ]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Keyboard className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-900">Keyboard Shortcuts</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Navigation</p>
                    <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600 font-medium">Dashboard</span>
                       <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-900">Ctrl + D</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600 font-medium">Users Table</span>
                       <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-900">Ctrl + U</kbd>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Interface</p>
                    <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600 font-medium">Toggle Sidebar</span>
                       <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-900">Ctrl + B</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600 font-medium">Help Menu</span>
                       <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-900">?</kbd>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-center">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Press ESC to close</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
