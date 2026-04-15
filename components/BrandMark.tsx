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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const HOLD_DURATION = 5000; // 5 seconds

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent context menu on long press for mobile
    if (e.type === 'touchstart') {
      // e.preventDefault(); 
    }
    
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
      toggleHiddenMode();
      cancelPress();
    }
  };

  const cancelPress = () => {
    setIsPressing(false);
    setPressProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  useEffect(() => {
    return () => cancelPress();
  }, []);

  return (
    <div 
      className="relative group inline-flex items-center select-none"
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
    >
      <Link href={href} className="transition-transform hover:scale-[1.02] active:scale-[0.98]">
        <div className="relative w-[110px] h-[28px] sm:w-[150px] sm:h-[38px] flex-shrink-0">
          <Image
            src="/logo.png"
            alt="DailyHabit Flow"
            fill
            className="object-contain"
            priority
          />
        </div>
      </Link>

      {/* Secret Progress Indicator */}
      {isPressing && (
        <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden pointer-events-none">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pressProgress}%` }}
            className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          />
        </div>
      )}
    </div>
  );
}

