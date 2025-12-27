'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Home, Menu, X, TrendingUp, Target } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 4);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/habits', label: 'Habits', icon: Target },
    { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50' 
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18 lg:h-20">
          {/* Logo/Brand */}
          <div className="flex items-center min-w-0 flex-1">
            <Link 
              href="/dashboard" 
              className="flex items-center text-primary-600 font-bold text-base sm:text-lg md:text-xl lg:text-2xl min-w-0 group transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <Home className="mr-2 sm:mr-2.5 lg:mr-3 flex-shrink-0 transition-all duration-300 group-hover:text-primary-700" size={20} />
                <div className="absolute -inset-1 bg-primary-200 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
              <span className="hidden xs:inline truncate font-extrabold">Habit Tracker</span>
              <span className="xs:hidden truncate font-extrabold">HT</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-3 ml-6 lg:ml-10 xl:ml-16">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center gap-2 text-gray-700 hover:text-primary-600 px-3 xl:px-4 py-2.5 rounded-xl text-sm xl:text-base font-semibold transition-all duration-300 hover:bg-primary-50 hover:shadow-md hover-lift relative overflow-hidden"
                  >
                    <Icon size={16} className="transition-transform duration-300 group-hover:scale-110" />
                    {link.label}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Desktop Logout */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 text-gray-700 hover:text-red-600 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-red-50 hover-lift group"
            >
              <LogOut size={16} className="transition-transform duration-300 group-hover:rotate-12" />
              <span>Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-gray-700 hover:text-gray-900 p-2.5 touch-manipulation rounded-xl transition-all duration-300 hover:bg-gray-100 hover:scale-105 active:scale-95"
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <Menu 
                  size={22} 
                  className={`absolute transition-all duration-300 ${
                    mobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                  }`} 
                />
                <X 
                  size={22} 
                  className={`absolute transition-all duration-300 ${
                    mobileMenuOpen ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
                  }`} 
                />
              </div>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          mobileMenuOpen 
            ? 'max-h-96 opacity-100 translate-y-0' 
            : 'max-h-0 opacity-0 -translate-y-2'
        }`}>
          <div className="border-t border-gray-200 py-3 space-y-1 bg-white/95 backdrop-blur-sm">
            {navLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-xl text-base font-semibold transition-all duration-300 mx-2 hover-lift"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="relative">
                    <Icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
                    <div className="absolute -inset-1 bg-primary-200 rounded opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                  </div>
                  {link.label}
                </Link>
              );
            })}
            
            {/* Mobile Logout */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 mx-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl text-base font-semibold transition-all duration-300 hover-lift group"
            >
              <div className="relative">
                <LogOut size={18} className="transition-transform duration-300 group-hover:rotate-12" />
                <div className="absolute -inset-1 bg-red-200 rounded opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </div>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

