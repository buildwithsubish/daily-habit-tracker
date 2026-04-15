'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function BrandMark({ href = '/dashboard' }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center transition-transform hover:scale-[1.02] active:scale-[0.98]">
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
  );
}

