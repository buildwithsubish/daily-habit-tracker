"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  overlay?: boolean;
  className?: string;
}

export function ResponsiveDrawer({
  children,
  isOpen,
  onClose,
  position = 'left',
  size = 'md',
  overlay = true,
  className = ''
}: ResponsiveDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  const sizeClasses = {
    sm: 'w-20',
    md: 'w-64',
    lg: 'w-96',
    xl: 'w-[28rem]'
  };

  const positionClasses = {
    left: 'left-0',
    right: 'right-0'
  };

  const drawerClasses = cn(
    'fixed top-0 h-screen bg-slate-900 text-white shadow-2xl z-50 transition-transform duration-300 ease-in-out',
    sizeClasses[size],
    positionClasses[position],
    isOpen ? 'translate-x-0' : position === 'left' ? '-translate-x-full' : 'translate-x-full',
    !isMobile && 'lg:translate-x-0 lg:fixed lg:z-40 lg:shadow-none',
    className
  );

  const overlayClasses = cn(
    'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300',
    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
    !isMobile && 'lg:hidden'
  );

  return (
    <>
      {overlay && (
        <div
          className={overlayClasses}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div className={drawerClasses}>
        {children}
      </div>
    </>
  );
}

interface DrawerToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function DrawerToggle({ isOpen, onToggle, className = '', children }: DrawerToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'lg:hidden drawer-toggle p-3 bg-slate-900 text-white rounded-xl shadow-lg touch-button border border-slate-700',
        className
      )}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {children || (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      )}
    </button>
  );
}

interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerContent({ children, className = '' }: DrawerContentProps) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      {children}
    </div>
  );
}

interface DrawerHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerHeader({ children, className = '' }: DrawerHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between p-4 border-b border-slate-700', className)}>
      {children}
    </div>
  );
}

interface DrawerBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerBody({ children, className = '' }: DrawerBodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-4', className)}>
      {children}
    </div>
  );
}

interface DrawerFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className = '' }: DrawerFooterProps) {
  return (
    <div className={cn('border-t border-slate-700 p-4', className)}>
      {children}
    </div>
  );
}

export default ResponsiveDrawer;
