"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Layers, BarChart3, 
  Settings, ChevronLeft,
  Shield, LogOut, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/lib/store/admin-store';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ResponsiveDrawer, DrawerToggle, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from '@/components/ui/ResponsiveDrawer';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Layers, label: 'Presets', href: '/admin/presets' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar } = useAdminStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  const handleMenuItemClick = () => {
    // Close mobile menu after navigation
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(false);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Sign out failed');
      router.replace('/admin/login');
      router.refresh();
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <DrawerToggle
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-40"
      />

      {/* Responsive Drawer for Mobile, Fixed Sidebar for Desktop */}
      <ResponsiveDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        position="left"
        size="md"
        overlay={true}
        className={cn('border-r border-slate-800', isSidebarCollapsed && 'lg:!w-20')}
      >
        <DrawerContent>
          {/* Logo Section */}
          <DrawerHeader className="h-16">
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Shield size={20} />
                </div>
                <span className="text-lg font-bold text-white tracking-tight hidden lg:block">AdminPanel</span>
                <span className="text-lg font-bold text-white lg:hidden">Admin</span>
              </motion.div>
            )}
            {isSidebarCollapsed && (
              <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Shield size={20} />
              </div>
            )}
            
            {/* Desktop Toggle Button */}
            <button 
              onClick={toggleSidebar}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-800 transition-colors touch-button"
            >
              <ChevronLeft className={cn("transition-transform duration-300 text-slate-400", isSidebarCollapsed && "rotate-180")} size={20} />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden h-8 w-8 items-center justify-center rounded-md hover:bg-slate-800 transition-colors flex touch-button"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </DrawerHeader>

          {/* Navigation */}
          <DrawerBody className="space-y-1 px-3 py-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMenuItemClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 sm:py-2 text-sm font-medium transition-all group relative touch-button",
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
                      className="hidden lg:block"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {/* Mobile: Always show label */}
                  <span className="lg:hidden text-white">{item.label}</span>
                  {isSidebarCollapsed && (
                     <div className="absolute left-14 invisible group-hover:visible bg-slate-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50 hidden lg:block">
                      {item.label}
                     </div>
                  )}
                </Link>
              );
            })}
          </DrawerBody>

          {/* Footer */}
          <DrawerFooter>
            {signOutError && <p role="alert" className="mb-2 text-xs leading-relaxed text-rose-300">Could not sign out. Check your connection and try again.</p>}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label={signingOut ? 'Signing out' : 'Sign out'}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60 group relative touch-button"
              )}
            >
              <LogOut size={20} className="min-w-[20px] text-slate-400" />
              <span className={cn('text-white', isSidebarCollapsed && 'lg:hidden')}>{signingOut ? 'Signing out…' : 'Sign out'}</span>
              {isSidebarCollapsed && (
                 <div className="absolute left-14 invisible group-hover:visible bg-red-500 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap z-50 hidden lg:block">
                  Sign Out
                 </div>
              )}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </ResponsiveDrawer>
    </>
  );
}
