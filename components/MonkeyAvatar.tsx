'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface MonkeyAvatarProps {
  isPasswordVisible: boolean;
  isPasswordFocused: boolean;
}

export default function MonkeyAvatar({ isPasswordVisible, isPasswordFocused }: MonkeyAvatarProps) {
  // State 1: Normal (Eyes open, hands down)
  // State 2: Peeking (Eyes open, hands up but not covering) - when password visible
  // State 3: Hiding (Hands covering eyes) - when password focused and hidden
  
  const isHiding = isPasswordFocused && !isPasswordVisible;
  const isPeeking = isPasswordVisible;

  return (
    <div className="relative w-32 h-32 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
      <svg
        viewBox="0 0 100 100"
        className="w-24 h-24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Face */}
        <circle cx="50" cy="50" r="40" fill="#8B4513" />
        <ellipse cx="50" cy="55" rx="30" ry="25" fill="#DEB887" />
        
        {/* Ears */}
        <circle cx="15" cy="45" r="10" fill="#8B4513" />
        <circle cx="85" cy="45" r="10" fill="#8B4513" />
        <circle cx="15" cy="45" r="6" fill="#DEB887" />
        <circle cx="85" cy="45" r="6" fill="#DEB887" />

        {/* Eyes */}
        <g>
          <circle cx="38" cy="45" r="6" fill="white" />
          <motion.circle 
            cx="38" 
            cy="45" 
            r="3" 
            fill="black"
            animate={{
              scaleY: isHiding ? 0 : 1,
            }}
          />
          
          <circle cx="62" cy="45" r="6" fill="white" />
          <motion.circle 
            cx="62" 
            cy="45" 
            r="3" 
            fill="black"
            animate={{
              scaleY: isHiding ? 0 : 1,
            }}
          />
        </g>

        {/* Mouth */}
        <path
          d="M40 65 C 45 70, 55 70, 60 65"
          stroke="#8B4513"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Hands */}
        <motion.g
          initial={false}
          animate={{
            y: isHiding ? -25 : isPeeking ? -10 : 20,
            x: isPeeking ? (isHiding ? 0 : 5) : 0,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Left Hand */}
          <motion.circle 
            cx="30" 
            cy="75" 
            r="12" 
            fill="#8B4513" 
            animate={{
              x: isPeeking ? -5 : 0
            }}
          />
          {/* Right Hand */}
          <motion.circle 
            cx="70" 
            cy="75" 
            r="12" 
            fill="#8B4513" 
            animate={{
              x: isPeeking ? 5 : 0
            }}
          />
        </motion.g>
      </svg>
    </div>
  );
}
