'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function BrandMark({ href = '/dashboard' }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 sm:gap-3 transition-opacity hover:opacity-90">
      <div className="relative w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0">
        <svg viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="infinityLoop" x1="10" y1="35" x2="110" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0ea5e9" /> {/* sky-500 */}
              <stop offset="0.5" stopColor="#06b6d4" /> {/* cyan-500 */}
              <stop offset="1" stopColor="#10b981" /> {/* emerald-500 */}
            </linearGradient>
            
            {/* Calendar Icon Symbol */}
            <g id="cal-check" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="white">
              <rect x="0" y="4" width="20" height="20" rx="4" />
              <path d="M 5 0 L 5 8" strokeWidth="3" />
              <path d="M 15 0 L 15 8" strokeWidth="3" />
              <path d="M 0 12 L 20 12" strokeWidth="3" />
              {/* Checkmark */}
              <path d="M 4 17 L 8 21 L 16 13" stroke="#10b981" strokeWidth="3.5" fill="none" />
            </g>
          </defs>
          
          {/* Main Infinity Path, creating the swoop */}
          <path 
            d="M 5 55 C 10 57, 25 57, 35 45 L 80 15 C 95 5, 115 15, 110 35 C 105 50, 90 55, 80 45 L 35 15 C 20 5, 0 15, 5 35 C 8 45, 15 50, 25 50" 
            stroke="url(#infinityLoop)" 
            strokeWidth="9" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* ArrowHead at the top right */}
          <path 
            d="M 100 10 L 115 10 L 115 25" 
            stroke="#10b981" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />

          {/* Floating Calendars ascending the slope */}
          <g transform="translate(30, 32) rotate(-35) scale(0.65)" stroke="#0ea5e9">
            <use href="#cal-check" />
          </g>
          <g transform="translate(48, 20) rotate(-35) scale(0.65)" stroke="#06b6d4">
            <use href="#cal-check" />
          </g>
          <g transform="translate(66, 8) rotate(-35) scale(0.65)" stroke="#10b981">
            <use href="#cal-check" />
          </g>
        </svg>
      </div>

      <div className="leading-none flex items-center">
        <div className="text-[17px] sm:text-[20px] font-[800] tracking-tight text-[#0ea5e9] dark:text-[#38bdf8]">
          DailyHabit
        </div>
        <div className="hidden sm:block text-[17px] sm:text-[20px] font-[600] italic tracking-tight text-[#10b981] dark:text-[#34d399] ml-[4px]">
          Flow
        </div>
      </div>
    </Link>
  );
}
