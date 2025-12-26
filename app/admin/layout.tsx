"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check auth for dashboard, not login/reset pages
    if (pathname === '/admin/dashboard') {
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

  return <>{children}</>;
}

