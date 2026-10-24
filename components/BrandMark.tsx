'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useHiddenMode } from '@/context/HiddenModeContext';

export default function BrandMark({ href = '/dashboard' }: { href?: string }) {
  const { isHiddenMode, toggleHiddenMode } = useHiddenMode();
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const longPressedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fast and responsive hold (600ms) without tedious 5-second waiting
  const HOLD_DURATION = 600;

  const cancelPress = useCallback(() => {
    setIsPressing(false);
    setTimeout(() => {
      setPressProgress(0);
    }, 150);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }, []);

  const handleComplete = useCallback(() => {
    if (timerRef.current) {
      longPressedRef.current = true;
      toggleHiddenMode();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore
        }
      }
      cancelPress();
    }
  }, [toggleHiddenMode, cancelPress]);

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    longPressedRef.current = false;
    setIsPressing(true);
    setPressProgress(0);
    const totalDuration = HOLD_DURATION;
    setCountdown(1);
    
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 100);
      setPressProgress(progress);
      setCountdown(Math.max(1, Math.ceil((totalDuration - elapsed) / 1000)));
      
      if (progress >= 100) {
        handleComplete();
      }
    }, 40);

    timerRef.current = setTimeout(handleComplete, totalDuration);
  }, [isHiddenMode, handleComplete]);

  const handleClick = (e: React.MouseEvent) => {
    if (longPressedRef.current || isPressing) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    return () => cancelPress();
  }, [cancelPress]);

  return (
    <div className="relative group inline-flex items-center gap-3 select-none">
      {/* Secret Logo Trigger */}
      <div
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
        className={`relative w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] flex-shrink-0 cursor-pointer select-none transition-all duration-300 ${
          isPressing ? 'scale-90 rotate-2' : 'hover:scale-105 active:scale-95'
        }`}
      >
        <Image
          src="/logo.png"
          alt="DF"
          fill
          sizes="(max-width: 640px) 34px, 42px"
          className="object-contain pointer-events-none select-none"
          priority
          draggable={false}
        />
        
        {/* Secret Circular Progress */}
        {isPressing && (
          <svg
            viewBox="0 0 48 48"
            className="absolute -inset-1.5 -rotate-90 w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none z-10"
          >
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-200/50 dark:text-zinc-800/80"
            />
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="url(#brand-logo-gradient)"
              strokeWidth="3"
              strokeDasharray={132}
              strokeDashoffset={132 - (pressProgress / 100) * 132}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75"
            />
            <defs>
              <linearGradient id="brand-logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {/* Hold Countdown Tooltip */}
        <AnimatePresence>
          {isPressing && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 dark:bg-zinc-800/95 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xl backdrop-blur-md pointer-events-none z-50 flex items-center gap-1.5 border border-white/10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>{!isHiddenMode ? 'Release to reveal' : 'Release to conceal'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Text Header */}
      <Link 
        href={href}
        onClick={handleClick}
        className="flex flex-col group/text"
      >
        <h1 className="responsive-text-lg sm:responsive-text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tightest leading-none flex items-center gap-1">
          Daily Habit <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover/text:from-indigo-500 group-hover/text:to-purple-500 transition-all duration-300">Flow</span>
        </h1>
        <p className="text-[9px] sm:text-[11px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
           Premium Habit Architecture
        </p>
      </Link>
    </div>
  );
}
