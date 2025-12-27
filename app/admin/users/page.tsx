'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, Search, Eye, EyeOff, ChevronRight, 
  Shield, Calendar, Target, TrendingUp, LogOut, Lock, AlertCircle, CheckCircle, Palette
} from 'lucide-react';

interface Theme {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  colors: Record<string, string>;
}

interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  timeZone: string;
  stats: {
    habitCount: number;
    logCount: number;
    completedLogs: number;
    completionRate: string;
    lastActivity: string | null;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedUserForTheme, setSelectedUserForTheme] = useState<User | null>(null);
  const [assigningTheme, setAssigningTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchThemes();
  }, [page, search]);

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes?includeCustom=false');
      if (res.ok) {
        const data = await res.json();
        setThemes(data);
      }
    } catch (error) {
      console.error('Failed to fetch themes:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignThemeToUser = async (themeId: string) => {
    if (!selectedUserForTheme) return;
    
    setAssigningTheme(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForTheme.id}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (res.ok) {
        const data = await res.json();
        setThemeMessage({ type: 'success', text: `Theme assigned to ${selectedUserForTheme.email}` });
        setShowThemeModal(false);
        setTimeout(() => {
          setThemeMessage(null);
          setSelectedUserForTheme(null);
        }, 3000);
      } else {
        const error = await res.json();
        setThemeMessage({ type: 'error', text: error.error || 'Failed to assign theme' });
      }
    } catch (error) {
      setThemeMessage({ type: 'error', text: 'Failed to assign theme' });
    } finally {
      setAssigningTheme(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-white" size={28} />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
                <p className="text-sm opacity-90">Monitor all users and their activities</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by email or username..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-medium"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden animate-scale-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Email</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Username</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Habits</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Completion</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Last Activity</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-b hover:bg-gray-50 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <Calendar size={12} className="inline mr-1" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-700 font-medium">{user.username}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Target className="text-blue-500" size={18} />
                        <span className="font-bold text-gray-900">{user.stats.habitCount}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-green-500" size={18} />
                        <span className="font-bold text-gray-900">{user.stats.completionRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {user.stats.completedLogs}/{user.stats.logCount} completed
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.stats.lastActivity ? (
                        <span className="text-sm text-gray-700">
                          {new Date(user.stats.lastActivity).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUserForTheme(user);
                            setShowThemeModal(true);
                            setThemeMessage(null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
                          title="Assign Theme"
                        >
                          <Palette size={16} />
                          Theme
                        </button>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                        >
                          View Details
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Previous
              </button>
              <span className="text-gray-700 font-semibold">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Theme Assignment Message */}
        {themeMessage && (
          <div className={`mt-4 p-4 rounded-lg border ${
            themeMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {themeMessage.text}
          </div>
        )}

        {/* Theme Assignment Modal */}
        {showThemeModal && selectedUserForTheme && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="text-purple-600" size={24} />
                <h3 className="text-xl font-bold text-gray-900">Assign Theme</h3>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-3 mb-4 rounded">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="inline mr-2" size={16} />
                  Assigning a theme to: <strong>{selectedUserForTheme.email}</strong>
                </p>
              </div>

              {themes.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No themes available
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {themes.map((theme) => (
                    <button
                      key={theme._id}
                      onClick={() => assignThemeToUser(theme._id)}
                      disabled={assigningTheme}
                      className="w-full p-3 text-left rounded-lg border-2 border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all disabled:opacity-50"
                    >
                      <div className="font-semibold text-gray-900">{theme.displayName}</div>
                      <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                      <div className="flex gap-1 mt-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowThemeModal(false);
                    setSelectedUserForTheme(null);
                    setThemeMessage(null);
                  }}
                  disabled={assigningTheme}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

