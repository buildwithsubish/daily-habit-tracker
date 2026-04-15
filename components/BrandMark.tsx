'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

import { useState, useRef, useEffect } from 'react';
import { useHiddenMode } from '@/context/HiddenModeContext';

export default function BrandMark({ href = '/dashboard' }: { href?: string }) {
  const { toggleHiddenMode } = useHiddenMode();
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const longPressedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const HOLD_DURATION = 5000; // 5 seconds
  const START_THRESHOLD = 200; // ms to distinguish between click and press start

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    longPressedRef.current = false;
    setIsPressing(true);
    setPressProgress(0);
    
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setPressProgress(progress);
      
      if (progress >= 100) {
        handleComplete();
      }
    }, 50);

    timerRef.current = setTimeout(handleComplete, HOLD_DURATION);
  };

  const handleComplete = () => {
    if (timerRef.current) {
      longPressedRef.current = true;
      toggleHiddenMode();
      cancelPress();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressedRef.current || isPressing) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const cancelPress = () => {
    setIsPressing(false);
    setTimeout(() => {
      setPressProgress(0);
    }, 100);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  useEffect(() => {
    return () => cancelPress();
  }, []);

  return (
    <div className="relative group inline-flex items-center gap-3 select-none">
      {/* Secret Logo Trigger */}
      <div
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        className={`relative w-[32px] h-[32px] sm:w-[42px] sm:h-[42px] flex-shrink-0 cursor-pointer transition-all duration-300 ${isPressing ? 'scale-90 rotate-3' : 'hover:scale-105 active:scale-95'}`}
      >
        <Image
          src="/logo.png"
          alt="DF"
          fill
          className="object-contain"
          priority
        />
        
        {/* Secret Circular Progress */}
        {isPressing && (
          <svg className="absolute -inset-2 -rotate-90 w-[calc(100%+16px)] h-[calc(100%+16px)] opacity-60">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/10 dark:text-zinc-800"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#logo-gradient)"
              strokeWidth="2"
              strokeDasharray="100"
              animate={{ strokeDashoffset: 100 - pressProgress }}
              className="text-indigo-500"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Navigation Text Header */}
      <Link 
        href={href}
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

