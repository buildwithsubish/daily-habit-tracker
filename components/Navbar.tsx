'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Target, BarChart3, Menu, X, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    { href: '/dashboard/habits', label: 'My Habits', icon: Target },
    { href: '/dashboard/analytics', label: 'Progress', icon: BarChart3 },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled 
        ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3' 
        : 'bg-white border-b border-slate-100 py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="bg-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <Shield className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">HabitTracker</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 text-[11px] font-black tracking-[0.1em] transition-all duration-300 hover:text-blue-600 uppercase ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  <Icon size={14} />
                  {link.label}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-underline"
                      className="absolute -bottom-2 left-0 right-0 h-0.5 bg-blue-600"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 uppercase"
            >
              <LogOut size={14} />
              Sign Out
            </button>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden bg-slate-100 p-2.5 rounded-xl text-black hover:bg-slate-200 transition-all"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
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
            className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-6 py-8 space-y-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-xs font-black tracking-widest transition-all uppercase ${
                      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-xs font-black tracking-widest bg-red-50 text-red-500 hover:bg-red-100 transition-all uppercase"
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
