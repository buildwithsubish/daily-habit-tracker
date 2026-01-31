"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { useAdminStore } from '@/lib/store/admin-store';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/Providers';
import { ShortcutOverlay } from '@/components/admin/ShortcutOverlay';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSidebarCollapsed } = useAdminStore();

  useEffect(() => {
    // Only check auth for dashboard and other admin pages, not login/reset
    const publicPages = ['/admin/login', '/admin/reset-password'];
    if (!publicPages.includes(pathname)) {
      fetch('/api/admin/stats')
        .then(res => {
          if (res.status === 401) {
            router.push('/admin/login');
          }
        })
        .catch(() => {
          router.push('/admin/login');
        });
    }
  }, [pathname, router]);

  const isPublicPage = ['/admin/login', '/admin/reset-password'].includes(pathname);

  if (isPublicPage) {
    return <Providers>{children}</Providers>;
  }

  return (
    <Providers>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar />
        <div 
          className={cn(
            "transition-all duration-300 min-h-screen flex flex-col",
            isSidebarCollapsed ? "pl-20" : "pl-64"
          )}
        >
          <AdminNavbar />
          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
        <ShortcutOverlay />
      </div>
    </Providers>
  );
}

