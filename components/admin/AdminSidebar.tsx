"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Layers, BarChart3, 
  CreditCard, Settings, Users2, ChevronLeft, 
  Shield, LogOut, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/lib/store/admin-store';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Layers, label: 'Presets', href: '/admin/presets' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: CreditCard, label: 'Billing', href: '/admin/billing' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
  { icon: Users2, label: 'Team', href: '/admin/team' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useAdminStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 80 : 260 }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-slate-800 bg-slate-900 text-slate-300 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Shield size={20} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">AdminPanel</span>
            </motion.div>
          )}
          {isSidebarCollapsed && (
            <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Shield size={20} />
            </div>
          )}
          <button 
            onClick={toggleSidebar}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className={cn("transition-transform duration-300", isSidebarCollapsed && "rotate-180")} size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group relative",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon size={20} className={cn("min-w-[20px]", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {!isSidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
                {isSidebarCollapsed && (
                   <div className="absolute left-14 invisible group-hover:visible bg-slate-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
                    {item.label}
                   </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => {/* handle logout */}}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors group relative"
            )}
          >
            <LogOut size={20} className="min-w-[20px]" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
            {isSidebarCollapsed && (
               <div className="absolute left-14 invisible group-hover:visible bg-red-500 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50">
                Sign Out
               </div>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
