'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center min-w-0 flex-1">
            <Link href="/dashboard" className="flex items-center text-primary-600 font-bold text-sm sm:text-base md:text-lg min-w-0">
              <Home className="mr-1.5 sm:mr-2 flex-shrink-0" size={18} />
              <span className="hidden sm:inline truncate">Habit Tracker</span>
              <span className="sm:hidden truncate">Habits</span>
            </Link>
            <div className="hidden md:flex items-center space-x-1 ml-4 lg:ml-8">
              <Link href="/dashboard" className="text-gray-700 hover:text-primary-600 px-2 lg:px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/habits" className="text-gray-700 hover:text-primary-600 px-2 lg:px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                Habits
              </Link>
              <Link href="/dashboard/analytics" className="text-gray-700 hover:text-primary-600 px-2 lg:px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
                Analytics
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="hidden sm:flex text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg text-sm font-semibold items-center transition-colors"
            >
              <LogOut size={16} className="mr-1.5" />
              Logout
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 hover:text-gray-900 p-2 touch-manipulation"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3 space-y-1 animate-fade-in-up">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/habits"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Habits
            </Link>
            <Link
              href="/dashboard/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg text-sm font-semibold transition-colors"
            >
              Analytics
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-semibold flex items-center transition-colors"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

