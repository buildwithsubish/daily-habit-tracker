'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  UserPlus,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  UserX,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import type { AdminRole } from '@/lib/models/Admin';

type AdminMember = {
  _id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string | null;
  lastLoginIP?: string | null;
  createdAt: string;
  isSelf: boolean;
};

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'Full system privileges: Team, roles, security policies & database mutations',
  admin: 'Platform management: User CRUD, habit data mutations, analytics & health overview',
  manager: 'Operational access: User suspension & support, presets, analytics review',
  editor: 'Content CRUD: Templates, presets & habit libraries (read-only on users)',
  viewer: 'Read-only access: View statistics, system health, user lists without edit access',
};

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )admin_csrf_token=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('manager');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  // Role Edit Modal State
  const [selectedAdmin, setSelectedAdmin] = useState<AdminMember | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>('manager');
  const [roleBusy, setRoleBusy] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/team', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.admins) {
        setAdmins(data.admins);
        if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
      }
    } catch {
      setMessage({ kind: 'error', text: 'Failed to load administrator team' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTeam();
  }, []);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (inviteBusy) return;
    if (invitePassword.length < 14) {
      setMessage({ kind: 'error', text: 'Password must be at least 14 characters long' });
      return;
    }
    setInviteBusy(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          temporaryPassword: invitePassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create team member');

      setMessage({ kind: 'success', text: data.message || 'Administrator invited successfully' });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInvitePassword('');
      await fetchTeam();
    } catch (err: any) {
      setMessage({ kind: 'error', text: err.message || 'Invitation failed' });
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedAdmin || roleBusy) return;
    setRoleBusy(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          adminId: selectedAdmin._id,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update role');

      setMessage({ kind: 'success', text: data.message });
      setSelectedAdmin(null);
      await fetchTeam();
    } catch (err: any) {
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setRoleBusy(false);
    }
  };

  const handleToggleActive = async (admin: AdminMember) => {
    const nextStatus = !admin.isActive;
    const confirmPrompt = window.confirm(
      `Are you sure you want to ${nextStatus ? 'activate' : 'suspend'} ${admin.email}?`
    );
    if (!confirmPrompt) return;

    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          adminId: admin._id,
          isActive: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Status update failed');

      setMessage({ kind: 'success', text: data.message });
      await fetchTeam();
    } catch (err: any) {
      setMessage({ kind: 'error', text: err.message });
    }
  };

  const handleResetMFA = async (admin: AdminMember) => {
    const confirmPrompt = window.confirm(
      `Reset 2FA for ${admin.email}? The admin will need to set up an authenticator again.`
    );
    if (!confirmPrompt) return;

    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          adminId: admin._id,
          resetMFA: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'MFA reset failed');

      setMessage({ kind: 'success', text: `2FA reset for ${admin.email}` });
      await fetchTeam();
    } catch (err: any) {
      setMessage({ kind: 'error', text: err.message });
    }
  };

  const isSuperAdmin = currentUserRole === 'super_admin';

  return (
    <main className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-400">Governance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Admin Team & RBAC Management
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Granular Role-Based Access Control: assign SuperAdmin, Manager, Editor, or Viewer roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTeam}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <UserPlus size={15} /> Add Administrator
            </button>
          )}
        </div>
      </header>

      {message && (
        <div
          role={message.kind === 'success' ? 'status' : 'alert'}
          className={`flex items-start gap-2 rounded-xl p-4 text-sm font-medium ${
            message.kind === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
          }`}
        >
          {message.kind === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          {message.text}
        </div>
      )}

      {/* RBAC Role Matrix Reference */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(ROLE_DESCRIPTIONS) as AdminRole[]).map((r) => (
          <div key={r} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold capitalize ${
              r === 'super_admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' :
              r === 'admin' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300' :
              r === 'manager' ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300' :
              r === 'editor' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' :
              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {r.replace('_', ' ')}
            </span>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </section>

      {/* Administrators Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Role (RBAC)</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4">2FA Security</th>
                <th className="px-6 py-4">Last Login</th>
                {isSuperAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {admins.map((admin) => (
                <tr key={admin._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{admin.email}</p>
                      {admin.isSelf && (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Created {new Date(admin.createdAt).toLocaleDateString()}</p>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                      admin.role === 'super_admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' :
                      admin.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300' :
                      admin.role === 'manager' ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300' :
                      admin.role === 'editor' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {admin.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600" /> Suspended
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {admin.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={14} /> TOTP Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <ShieldAlert size={14} /> Not Configured
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {admin.lastLogin ? (
                      <>
                        <p className="text-slate-800 dark:text-slate-200">{new Date(admin.lastLogin).toLocaleString()}</p>
                        <p className="font-mono text-slate-400 text-[11px]">{admin.lastLoginIP || 'unknown IP'}</p>
                      </>
                    ) : (
                      'Never'
                    )}
                  </td>

                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setNewRole(admin.role);
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Role
                        </button>

                        {!admin.isSelf && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(admin)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                              admin.isActive
                                ? 'border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {admin.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        )}

                        {admin.twoFactorEnabled && (
                          <button
                            type="button"
                            onClick={() => handleResetMFA(admin)}
                            title="Reset 2FA"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invite Administrator</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Set role privileges and a temporary password (minimum 14 characters).
            </p>

            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">RBAC Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  <option value="super_admin">SuperAdmin (Full privileges)</option>
                  <option value="admin">Admin (User & Data operations)</option>
                  <option value="manager">Manager (Support & Operations)</option>
                  <option value="editor">Editor (Content CRUD only)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Initial Password (14+ characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={14}
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Minimum 14 characters"
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  User will be prompted to change password upon first sign-in.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteBusy || invitePassword.length < 14}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {inviteBusy ? 'Creating…' : 'Create Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Change Privileges</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Updating role for {selectedAdmin.email}</p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Assign Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="super_admin">SuperAdmin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAdmin(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRoleUpdate}
                disabled={roleBusy}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {roleBusy ? 'Updating…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
