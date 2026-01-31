'use client';

import { UsersTable } from '@/components/admin/UsersTable';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserPlus, UserX } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Directory</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage and monitor all platform members and their engagement</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Users size={16} />
              <span className="text-xs font-bold">All: 1.2k</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500">
              <UserCheck size={16} className="text-emerald-500" />
              <span className="text-xs font-bold">Active: 840</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500">
              <UserX size={16} className="text-red-500" />
              <span className="text-xs font-bold">Suspended: 12</span>
           </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <UsersTable />
      </motion.div>
    </div>
  );
}
