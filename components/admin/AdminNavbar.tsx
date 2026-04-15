"use client";

import { useAdminStore } from '@/lib/store/admin-store';
import { Button } from '@/components/ui/Button';
import { 
  Bell, Search, User, 
  Settings, HelpCircle, Sun, Moon,
  Keyboard, Download
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export function AdminNavbar() {
  const { isSidebarCollapsed } = useAdminStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search anything... (/)" 
            className="pl-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-300"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="hidden xl:flex font-bold border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50"
          onClick={() => toast.success("PWA Ready to install")}
        >
          <Download size={14} className="mr-2" /> Install App
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
          <Keyboard size={20} />
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
          <Sun size={20} />
        </Button>
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-50">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            AD
          </div>
          <div className="text-left hidden lg:block">
            <p className="text-sm font-bold text-slate-900 leading-none">Admin User</p>
            <p className="text-[10px] text-slate-500 leading-none mt-1">Super Admin</p>
          </div>
        </Button>
      </div>
    </header>
  );
}
