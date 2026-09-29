'use client';

import { UsersTable } from '@/components/admin/UsersTable';

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-indigo-700">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">User directory</h1>
          <p className="mt-2 text-sm text-slate-600">Review account status and habit activity.</p>
        </div>
      </div>

      <div>
        <UsersTable />
      </div>
    </div>
  );
}
