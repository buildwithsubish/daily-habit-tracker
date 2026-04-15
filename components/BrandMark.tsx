'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function BrandMark({ href = '/dashboard' }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 sm:gap-3 transition-opacity hover:opacity-90">
      <div className="relative w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0">
        <Image
          src="/logo.png"
          alt="DailyHabit Flow Logo"
          fill
          className="object-contain drop-shadow-sm"
          priority
        />
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

