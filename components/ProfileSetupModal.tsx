'use client';

import { useState } from 'react';
import { X, Save, ShieldCheck, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import KcalCalculator from './KcalCalculator';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function ProfileSetupModal({ isOpen, onClose, onSuccess, initialData }: ProfileSetupModalProps) {
  if (!isOpen) return null;

  const handleSave = async (profileData: any) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        toast.success('Health Profile Synchronized!', {
          icon: '🛡️',
          style: {
            borderRadius: '16px',
            background: '#18181b',
            color: '#fff',
          }
        });
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to sync health data');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <Heart size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none">Health Bio</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Configure your physical metrics</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <KcalCalculator initialData={initialData} onSave={handleSave} />
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/30 flex justify-center border-t border-zinc-100 dark:border-zinc-800">
             <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-emerald-500" /> End-to-end encrypted storage
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
