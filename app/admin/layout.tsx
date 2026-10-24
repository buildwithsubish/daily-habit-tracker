"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { useAdminStore } from '@/lib/store/admin-store';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/Providers';
import { ShortcutOverlay } from '@/components/admin/ShortcutOverlay';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  adminId: string | null;
  role: string | null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSidebarCollapsed } = useAdminStore();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    adminId: null,
    role: null,
  });
  const [authCheckFailed, setAuthCheckFailed] = useState(false);

  const checkAuth = useCallback(async () => {
    setAuthCheckFailed(false);
    setAuthState(current => ({ ...current, isLoading: true }));
    try {
      const res = await fetch('/api/admin/status', {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          adminId: data.adminId || null,
          role: data.role || null,
        });
      } else if (res.status === 401) {
        // Not authenticated
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          adminId: null,
          role: null,
        });
        
        // Only redirect if not on a public page
        const publicPages = ['/admin/login', '/admin/setup', '/admin/password', '/admin/reset-password'];
        if (!publicPages.includes(pathname)) {
          router.replace('/admin/login?redirect=' + encodeURIComponent(pathname));
        }
      } else {
        setAuthCheckFailed(true);
        setAuthState(current => ({ ...current, isLoading: false }));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthCheckFailed(true);
      setAuthState(current => ({ ...current, isLoading: false }));
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading state
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (authCheckFailed && !authState.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B0F19] p-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm sm:p-8" role="alert">
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">Could not verify admin access</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">The security check could not reach the server. Your session has not been cleared.</p>
          <button type="button" onClick={() => void checkAuth()} className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-md shadow-indigo-600/20">Try again</button>
        </section>
      </div>
    );
  }

  // Public pages that don't require authentication
  const publicPages = ['/admin/login', '/admin/setup', '/admin/password', '/admin/reset-password'];
  const isPublicPage = publicPages.includes(pathname);

  // If not authenticated and not on a public page, show access denied
  if (!authState.isAuthenticated && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19]">
        <div className="text-center max-w-md p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mx-4">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900/50">
            <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">You must be logged in as an administrator to access this area.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            Log In to Admin
          </button>
        </div>
      </div>
    );
  }

  // Public pages - show only children without sidebar
  if (isPublicPage) {
    return <Providers>{children}</Providers>;
  }

  return (
    <Providers>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors">
        <AdminSidebar />
        <div 
          className={cn(
            "transition-all duration-300 min-h-screen flex flex-col",
            // Desktop padding based on sidebar state
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          )}
        >
          <AdminNavbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <ShortcutOverlay />
      </div>
    </Providers>
  );
}
