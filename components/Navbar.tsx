'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, Sparkles, LogOut, LayoutDashboard, Target, BarChart3, Menu, X, Settings, Award } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandMark from './BrandMark';
import ThemeToggle from './ThemeToggle';
import { useApp } from '@/context/AppContext';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { advancedMode, toggleAdvancedMode } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Summary', icon: LayoutDashboard },
    { href: '/dashboard/habits', label: 'Habits', icon: Target },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/achievements', label: 'Milestones', icon: Award },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  if (!mounted) return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-14">
      <div className="responsive-container h-full flex items-center">
        <BrandMark />
      </div>
    </nav>
  );

  return (
    <nav 
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 h-14 flex items-center ${
      scrolled
        ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm'
        : 'bg-white dark:bg-gray-900 border-b border-transparent'
    }`}>
      <div className="premium-container">
        <div className="flex justify-between items-center relative">
          {/* Brand & Mobile Toggle - Left */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all active:scale-95"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
            </button>
            <BrandMark />
          </div>

          {/* Desktop Nav - Absolute Centered */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center p-1 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-700/50'
                      : 'text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Actions - Right */}
          <div className="flex items-center gap-1.5 sm:gap-4">
            {/* Advanced Mode Toggle */}
            <button
              onClick={toggleAdvancedMode}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 border ${
                advancedMode 
                  ? 'bg-white border-gray-200 text-indigo-600 dark:bg-gray-800 dark:border-gray-700 dark:text-indigo-400 shadow-sm' 
                  : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Sparkles size={14} className={advancedMode ? 'text-indigo-500 fill-indigo-500/20' : ''} />
              <span className="text-[10px] font-black uppercase tracking-wider">Advanced</span>
            </button>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-0.5 sm:mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5 sm:gap-3">
              <ThemeToggle />
              
              <Link
                href="/dashboard/settings"
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Settings size={18} />
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-14 left-0 right-0 lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg"
          >
            <div className="responsive-container py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors touch-button ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors touch-button"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
