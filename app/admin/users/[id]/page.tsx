'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Shield, Mail, User, Calendar, 
  Target, CheckCircle, TrendingUp, Activity, 
  Eye, EyeOff, Clock, BarChart3
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
    passwordHash: string;
    notificationPreferences: any;
  };
  habits: Array<{
    id: string;
    name: string;
    category: string;
    type: string;
    steps: any[];
    order: number;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/users"
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">User Tracking Details</h1>
                <p className="text-sm opacity-90">{data.user.email}</p>
              </div>
            </div>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
            >
              Back to Users
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="text-red-600" size={24} />
            User Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="text-blue-500" size={20} />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-bold text-gray-900">{data.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="text-green-500" size={20} />
              <div>
                <p className="text-xs text-gray-500">Username</p>
                <p className="font-bold text-gray-900">{data.user.username || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="text-purple-500" size={20} />
              <div>
                <p className="text-xs text-gray-500">Joined</p>
                <p className="font-bold text-gray-900">
                  {new Date(data.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Shield className="text-red-500" size={20} />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Password Management</p>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm transition-colors"
                >
                  Reset User Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500 animate-scale-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Habits</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.statistics.totalHabits}</p>
              </div>
              <Target className="text-blue-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500 animate-scale-in animation-delay-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Logs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.statistics.totalLogs}</p>
              </div>
              <Activity className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500 animate-scale-in animation-delay-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.statistics.completedLogs}</p>
              </div>
              <CheckCircle className="text-purple-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500 animate-scale-in animation-delay-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.statistics.completionRate}%</p>
              </div>
              <TrendingUp className="text-orange-500" size={40} />
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-red-600" size={24} />
            Activity Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Habits List */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="text-red-600" size={24} />
            User Habits ({data.habits.length})
          </h2>
          <div className="space-y-3">
            {data.habits.map((habit, index) => (
              <div
                key={habit.id}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-red-300 transition-all hover-lift animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{habit.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {habit.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Current Streak: <strong className="text-gray-900">{habit.streak.current} days</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={14} />
                        Longest: <strong className="text-gray-900">{habit.streak.longest} days</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-xl shadow-md p-6 animate-scale-in">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="text-red-600" size={24} />
            Recent Activity Logs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Habit</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Completed At</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.slice(0, 20).map((log, index) => {
                  const habit = data.habits.find(h => h.id === log.habitId);
                  return (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {habit?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        {log.completed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
                            <CheckCircle size={14} />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Reset User Password</h3>
              
              {resetMessage && (
                <div className={`mb-4 p-3 rounded-lg ${resetMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {resetMessage.text}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                The user will need to login with this new password.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword('');
                    setResetMessage(null);
                  }}
                  disabled={resetLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!newPassword || newPassword.length < 6 || resetLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
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

      const result = await res.json();
      if (res.ok) {
        setResetMessage({ type: 'success', text: '✅ Password reset successfully!' });
        setTimeout(() => {
          setShowResetModal(false);
          setNewPassword('');
          setResetMessage(null);
        }, 2000);
      } else {
        setResetMessage({ type: 'error', text: result.error || 'Failed to reset password' });
      }
    } catch (error) {
      setResetMessage({ type: 'error', text: 'Error resetting password' });
    } finally {
      setResetLoading(false);
    }
  }
}

