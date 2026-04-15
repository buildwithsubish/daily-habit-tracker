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

  const checkAuth = useCallback(async () => {
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
        const publicPages = ['/admin/login', '/admin/reset-password'];
        if (!publicPages.includes(pathname)) {
          router.push('/admin/login?redirect=' + encodeURIComponent(pathname));
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        adminId: null,
        role: null,
      });
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading state
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Public pages that don't require authentication
  const publicPages = ['/admin/login', '/admin/reset-password'];
  const isPublicPage = publicPages.includes(pathname);

  // If not authenticated and not on a public page, show access denied
  if (!authState.isAuthenticated && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">You must be logged in to access this page.</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Log In
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
      <div className="min-h-screen bg-slate-50">
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
