'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Mail, User, Calendar,
  Target, CheckCircle, TrendingUp, Activity,
  Eye, EyeOff, Clock, BarChart3, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface UserDetails {
  user: {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    timeZone: string;
    notificationPreferences: any;
    isActive?: boolean;
    isRateLimited?: boolean;
    lockRemainingMinutes?: number;
    lockUntil?: string | null;
    loginAttempts?: number;
    lastLogin?: string | null;
  };
  habits: Array<{
    id: string;
    name: string;
    category: string;
    type: string;
    steps: any[];
    order: number;
    hidden?: boolean;
    createdAt: string;
    streak: { current: number; longest: number };
  }>;
  logs: Array<{
    id: string;
    habitId: string;
    date: string;
    completed: boolean;
    stepIndex: number | null;
    completedAt: string | null;
  }>;
  statistics: {
    totalHabits: number;
    totalLogs: number;
    completedLogs: number;
    completionRate: string;
    activityByDate: Array<{ date: string; total: number; completed: number }>;
  };
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Destructive Action Safeguards State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getCsrfToken = () => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp('(^| )admin_csrf_token=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
  };

  const handleToggleSuspend = async () => {
    if (!data) return;
    const isCurrentlyActive = data.user.isActive !== false;
    const nextAction = isCurrentlyActive ? 'suspend' : 'unsuspend';
    
    if (isCurrentlyActive) {
      const confirmPrompt = window.confirm(
        `Are you sure you want to suspend user ${data.user.email}? They will be blocked from logging in.`
      );
      if (!confirmPrompt) return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          action: nextAction,
          confirmation: data.user.email,
        }),
      });
      const text = await res.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: `Server response error (${res.status})` };
      }
      if (!res.ok) throw new Error(result.error || result.message || 'Failed to update user status');

      setActionMessage({ type: 'success', text: result.message || `User ${nextAction}ed successfully.` });
      await fetchUserDetails();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Status update failed' });
    }
  };

  const handleUnlockUser = async () => {
    if (!data) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          action: 'unlock',
        }),
      });
      const text = await res.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: `Server response error (${res.status})` };
      }
      if (!res.ok) throw new Error(result.error || result.message || 'Failed to unlock user');

      setActionMessage({ type: 'success', text: result.message || 'User rate-limit lockout cleared.' });
      await fetchUserDetails();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Unlock failed' });
    }
  };

  const handleDeleteUser = async () => {
    if (!data || deleteConfirmation !== data.user.email) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
        }),
      });
      const text = await res.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: `Server response error (${res.status})` };
      }
      if (!res.ok) throw new Error(result.error || result.message || 'Failed to delete user');

      alert(`User ${data.user.email} has been permanently deleted.`);
      router.push('/admin/users');
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Deletion failed' });
      setDeleteLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (res.status === 404) {
        router.push('/admin/users');
        return;
      }
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.statistics.activityByDate.map(activity => ({
    date: new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: activity.total,
    completed: activity.completed,
    completionRate: activity.total > 0 ? ((activity.completed / activity.total) * 100).toFixed(1) : 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/users"
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <ArrowLeft size={24} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">User Tracking Details</h1>
                  {!data.user.isActive ? (
                    <span className="rounded-full bg-rose-500/20 text-rose-100 border border-rose-400/30 px-2.5 py-0.5 text-xs font-bold">
                      Suspended
                    </span>
                  ) : data.user.isRateLimited ? (
                    <span className="rounded-full bg-amber-500/20 text-amber-100 border border-amber-400/30 px-2.5 py-0.5 text-xs font-bold">
                      Rate-Limited ({data.user.lockRemainingMinutes || 0}m)
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-90 mt-0.5">{data.user.email}</p>
              </div>
            </div>
            <Link
              href="/admin/users"
              className="self-start sm:self-auto px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors font-bold text-sm"
            >
              Back to Users
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        {/* Rate-Limit Lockout Alert Banner */}
        {data.user.isRateLimited && (
          <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base flex items-center gap-2">
                  Account Temporarily Locked Out by Rate Limiter
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                  This user exceeded repeated sign-in limits ({data.user.loginAttempts || 5} failed attempts). Sign-in is automatically suspended for {data.user.lockRemainingMinutes || 15} more minutes. You can unlock them immediately below.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnlockUser}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all"
            >
              <Unlock size={14} /> Unlock Account Now
            </button>
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="text-indigo-600 dark:text-indigo-400" size={24} />
              User Information
            </h2>
            <div className="flex items-center gap-2">
              {!data.user.isActive ? (
                <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                  Suspended
                </span>
              ) : data.user.isRateLimited ? (
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Lock size={12} /> Rate-Limited ({data.user.lockRemainingMinutes || 0}m left)
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Active
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <Mail className="text-blue-500" size={20} />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <User className="text-emerald-500" size={20} />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Username</p>
                <p className="font-bold text-slate-900 dark:text-white">{data.user.username || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <Calendar className="text-purple-500" size={20} />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Joined</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {new Date(data.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <Shield className="text-indigo-500" size={20} />
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Credentials & Security</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors shadow-xs"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={handleToggleSuspend}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-xs ${
                      data.user.isActive === false
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {data.user.isActive === false ? 'Unsuspend Account' : 'Suspend Account'}
                  </button>
                  {data.user.isRateLimited && (
                    <button
                      onClick={handleUnlockUser}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors shadow-xs flex items-center gap-1"
                    >
                      <Unlock size={13} /> Clear Lockout
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDeleteConfirmation('');
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors shadow-xs"
                  >
                    Permanently Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
          {actionMessage && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-semibold ${
              actionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
            }`}>
              {actionMessage.text}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Total Habits</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{data.statistics.totalHabits}</p>
              </div>
              <Target className="text-blue-500" size={36} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Total Logs</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{data.statistics.totalLogs}</p>
              </div>
              <Activity className="text-emerald-500" size={36} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Completed</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{data.statistics.completedLogs}</p>
              </div>
              <CheckCircle className="text-purple-500" size={36} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Completion Rate</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{data.statistics.completionRate}%</p>
              </div>
              <TrendingUp className="text-amber-500" size={36} />
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 mb-6 min-h-[320px] w-full min-w-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} />
            Activity Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} initialDimension={{ width: 320, height: 300 }}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Habits List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="text-indigo-600 dark:text-indigo-400" size={24} />
            User Habits ({data.habits.length})
          </h2>
          <div className="space-y-3">
            {data.habits.map((habit, index) => (
              <div
                key={habit.id}
                className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">{habit.name}</h3>
                      <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                        {habit.category}
                      </span>
                      {habit.hidden && (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-900/60">
                          <EyeOff size={10} /> Hidden
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-indigo-500" />
                        Current Streak: <strong className="text-slate-800 dark:text-slate-200">{habit.streak.current} days</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={14} className="text-emerald-500" />
                        Longest: <strong className="text-slate-800 dark:text-slate-200">{habit.streak.longest} days</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={24} />
            Recent Activity Logs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Habit</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.logs.slice(0, 20).map((log) => {
                  const habit = data.habits.find(h => h.id === log.habitId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {habit?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        {log.completed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-900/60">
                            <CheckCircle size={13} />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        {log.completedAt
                          ? new Date(log.completedAt).toLocaleString()
                          : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Reset User Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Set a temporary or updated password for {data.user.email}.</p>

              {resetMessage && (
                <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${resetMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'}`}>
                  {resetMessage.text}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword('');
                    setResetMessage(null);
                  }}
                  disabled={resetLoading}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={!newPassword || newPassword.length < 6 || resetLoading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Destructive Action Safeguard Modal: Permanent User Deletion */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-rose-200 dark:border-rose-900/60">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 font-bold text-lg">⚠️</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Permanent Deletion</h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">Destructive & Irreversible Action</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                This will permanently delete account <strong className="font-mono text-slate-900 dark:text-white">{data.user.email}</strong> and purge all habits, progress entries, and historical logs.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{data.user.email}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter user email exactly"
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteConfirmation !== data.user.email || deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 text-xs font-bold transition-colors shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? 'Purging Data…' : 'Permanently Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      setResetMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const text = await res.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: `Server response error (${res.status})` };
      }

      if (res.ok) {
        setResetMessage({ type: 'success', text: '✅ Password reset successfully!' });
        setTimeout(() => {
          setShowResetModal(false);
          setNewPassword('');
          setResetMessage(null);
        }, 2000);
      } else {
        setResetMessage({ type: 'error', text: result.error || result.message || 'Failed to reset password' });
      }
    } catch (error) {
      setResetMessage({ type: 'error', text: 'Error resetting password' });
    } finally {
      setResetLoading(false);
    }
  }

}
