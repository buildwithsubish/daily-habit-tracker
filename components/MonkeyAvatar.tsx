'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface MonkeyAvatarProps {
  isPasswordVisible: boolean;
  isPasswordFocused: boolean;
}

const GREETINGS = ['Hai!', 'Hello!', 'Hey there!', 'Hi friend!', 'Yo!', 'Howdy!', 'Greetings!', 'Welcome!'];

export default function MonkeyAvatar({ isPasswordVisible, isPasswordFocused }: MonkeyAvatarProps) {
  // States:
  // - Normal: Just looking naturally
  // - Focused + Hidden: Scared, hands covering eyes
  // - Password visible: Curious/peeking with excitement
  
  const isHiding = isPasswordFocused && !isPasswordVisible;
  const isPeeking = isPasswordVisible && isPasswordFocused;
  const isNormal = !isPasswordFocused && !isPasswordVisible;

  // Random greeting on initial page load
  const [randomGreeting, setRandomGreeting] = useState<string | null>(null);
  const [showRandomGreeting, setShowRandomGreeting] = useState(true);

  useEffect(() => {
    // Pick a random greeting on mount
    const randomIndex = Math.floor(Math.random() * GREETINGS.length);
    setRandomGreeting(GREETINGS[randomIndex]);

    // Show random greeting for 2 seconds, then transition to "Hello!"
    const timer = setTimeout(() => {
      setShowRandomGreeting(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-40 h-40 mx-auto mb-8">
      <motion.div
        animate={{
          scale: isHiding ? 0.95 : isPeeking ? 1.05 : 1,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative w-full h-full"
      >
        {/* Body shadow */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-32 bg-black/10 rounded-full blur-xl" />
        
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ears */}
          <motion.g
            animate={{
              rotate: isPeeking ? [0, -5, 0] : isHiding ? [0, 5, 0] : 0,
            }}
            transition={{ duration: 0.5, repeat: isPeeking || isHiding ? Infinity : 0, repeatDelay: isPeeking || isHiding ? 2 : 0 }}
          >
            {/* Left Ear */}
            <circle cx="20" cy="50" r="14" fill="#8B4513" />
            <circle cx="20" cy="50" r="8" fill="#D2691E" />
            
            {/* Right Ear */}
            <circle cx="100" cy="50" r="14" fill="#8B4513" />
            <circle cx="100" cy="50" r="8" fill="#D2691E" />
          </motion.g>

          {/* Face base */}
          <ellipse cx="60" cy="60" rx="45" ry="40" fill="#8B4513" />
          <ellipse cx="60" cy="65" rx="38" ry="30" fill="#D2691E" />

          {/* Eyebrows - express emotion */}
          <motion.g
            animate={{
              y: isHiding ? 3 : isPeeking ? -3 : 0,
            }}
          >
            {/* Left Eyebrow */}
            <path 
              d="M32 42 Q40 38, 48 42" 
              stroke="#5D3A1A" 
              strokeWidth="3" 
              strokeLinecap="round"
            />
            {/* Right Eyebrow */}
            <path 
              d="M72 42 Q80 38, 88 42" 
              stroke="#5D3A1A" 
              strokeWidth="3" 
              strokeLinecap="round"
            />
          </motion.g>

          {/* Eyes */}
          <g>
            {/* Left Eye white */}
            <ellipse cx="45" cy="52" rx="10" ry="12" fill="white" />
            
            {/* Left Eye pupil */}
            <motion.circle
              cx="45"
              cy="52"
              r="5"
              fill="#1a1a1a"
              animate={{
                cx: isPeeking ? 48 : isHiding ? 45 : 45,
                cy: isPeeking ? 50 : isHiding ? 52 : 52,
                scale: isHiding ? 0.3 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            {/* Left Eye shine */}
            <circle cx="47" cy="50" r="2" fill="white" className={isHiding ? "opacity-0" : "opacity-60"} />

            {/* Right Eye white */}
            <ellipse cx="75" cy="52" rx="10" ry="12" fill="white" />
            
            {/* Right Eye pupil */}
            <motion.circle
              cx="75"
              cy="52"
              r="5"
              fill="#1a1a1a"
              animate={{
                cx: isPeeking ? 72 : isHiding ? 75 : 75,
                cy: isPeeking ? 50 : isHiding ? 52 : 52,
                scale: isHiding ? 0.3 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            {/* Right Eye shine */}
            <circle cx="77" cy="50" r="2" fill="white" className={isHiding ? "opacity-0" : "opacity-60"} />
          </g>

          {/* Nose */}
          <ellipse cx="60" cy="72" rx="12" ry="8" fill="#5D3A1A" />
          <ellipse cx="56" cy="72" rx="3" ry="4" fill="#1a1a1a" />
          <ellipse cx="64" cy="72" rx="3" ry="4" fill="#1a1a1a" />

          {/* Mouth */}
          <motion.g
            animate={{
              scaleY: isHiding ? -0.5 : isPeeking ? 1.2 : 1,
              y: isHiding ? 5 : isPeeking ? -2 : 0,
            }}
          >
            {isHiding ? (
              // Worried/Scared mouth (wavy line)
              <path
                d="M48 82 Q54 78, 60 82 Q66 86, 72 82"
                stroke="#5D3A1A"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            ) : isPeeking ? (
              // Excited smile (big open mouth)
              <path
                d="M45 80 Q60 95, 75 80"
                stroke="#5D3A1A"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              // Neutral smile
              <path
                d="M48 82 Q60 88, 72 82"
                stroke="#5D3A1A"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </motion.g>

          {/* Hands - The key animation fix */}
          <motion.g
            initial={false}
            animate={{
              y: isHiding ? -35 : isPeeking ? -15 : 15,
              x: isPeeking ? 8 : 0,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
          >
            {/* Left Hand */}
            <motion.g
              animate={{
                rotate: isPeeking ? -20 : 0,
              }}
            >
              <ellipse cx="25" cy="85" rx="14" ry="12" fill="#8B4513" />
              <ellipse cx="25" cy="85" rx="10" ry="8" fill="#D2691E" />
              {/* Fingers */}
              <circle cx="18" cy="78" r="4" fill="#8B4513" />
              <circle cx="25" cy="75" r="4" fill="#8B4513" />
              <circle cx="32" cy="78" r="4" fill="#8B4513" />
            </motion.g>

            {/* Right Hand */}
            <motion.g
              animate={{
                rotate: isPeeking ? 20 : 0,
              }}
            >
              <ellipse cx="95" cy="85" rx="14" ry="12" fill="#8B4513" />
              <ellipse cx="95" cy="85" rx="10" ry="8" fill="#D2691E" />
              {/* Fingers */}
              <circle cx="88" cy="78" r="4" fill="#8B4513" />
              <circle cx="95" cy="75" r="4" fill="#8B4513" />
              <circle cx="102" cy="78" r="4" fill="#8B4513" />
            </motion.g>
          </motion.g>

          {/* Cheek blush for peeking */}
          <motion.g
            animate={{
              opacity: isPeeking ? 0.6 : 0,
            }}
          >
            <ellipse cx="28" cy="68" rx="6" ry="4" fill="#FF6B6B" />
            <ellipse cx="92" cy="68" rx="6" ry="4" fill="#FF6B6B" />
          </motion.g>
        </svg>
      </motion.div>

      {/* Status indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
      >
        <AnimatePresence mode="wait">
          {isHiding && (
            <motion.div
              key="hiding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap"
            >
              Don't look!
            </motion.div>
          )}
          {isPeeking && (
            <motion.div
              key="peeking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap"
            >
              Curious!
            </motion.div>
          )}
          {/* Random greeting on initial load */}
          {showRandomGreeting && isNormal && randomGreeting && (
            <motion.div
              key="random-greeting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap"
            >
              {randomGreeting}
            </motion.div>
          )}
          {/* Normal "Hello!" after greeting fades */}
          {!showRandomGreeting && isNormal && (
            <motion.div
              key="normal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap"
            >
              Hello!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

