'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function MonkeyLogo() {
  const [isHovered, setIsHovered] = useState(false);
  
  /* ---------------- GREETINGS ---------------- */
  const greetings = ["Hi! 👋", "Hello! 🐵", "Hey there!", "Greetings!", "Ready!"];
  const [greeting, setGreeting] = useState(greetings[0]);

  /* Greeting on mount with wave */
  const [greetPose, setGreetPose] = useState(true);
  const [waveHand, setWaveHand] = useState<'left' | 'right' | null>('right');
  
  useEffect(() => {
    const randomGreeting =
      greetings[Math.floor(Math.random() * greetings.length)];
    setGreeting(randomGreeting);
  }, []);

  /* Wave animation during greeting */
  useEffect(() => {
    if (greetPose) {
      const interval = setInterval(() => {
        setWaveHand(prev => prev === 'right' ? 'left' : 'right');
      }, 150);
      
      const t = setTimeout(() => {
        setGreetPose(false);
        setWaveHand(null);
      }, 1800);
      
      return () => {
        clearInterval(interval);
        clearTimeout(t);
      };
    }
  }, [greetPose]);

  /* Greeting changes on hover */
  useEffect(() => {
    if (isHovered && !greetPose) {
      setGreeting("Nice to see you! 🐵");
    } else if (!isHovered && !greetPose) {
      setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    }
  }, [isHovered, greetPose]);

  /* ---------------- HAND ANIMATION ---------------- */
  const leftHand = {
    greet: { x: 0, y: 0, rotate: 0 },
    idle: { x: 0, y: 0, rotate: 0 },
    hover: { x: 8, y: -15, rotate: -20 },
    sad: { x: 0, y: 10, rotate: 0 },
  };

  const rightHand = {
    greet: { x: 10, y: -18, rotate: 40 },
    greetIdle: { x: 10, y: -12, rotate: 25 },
    idle: { x: 0, y: 0, rotate: 0 },
    hover: { x: -8, y: -15, rotate: 20 },
    sad: { x: 0, y: 10, rotate: 0 },
  };

  /* Determine hand state */
  const getHandState = () => {
    if (greetPose) return 'greet';
    if (isHovered) return 'hover';
    return 'idle';
  };

  const handState = getHandState();

  return (
    <div 
      className="flex items-center gap-3 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Speech Bubble */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 5 }}
        animate={{ opacity: greetPose ? 1 : 1, scale: 1, y: 0 }}
        className="absolute -top-8 left-0 z-20"
      >
        <div className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-white whitespace-nowrap">
          {greeting}
        </div>
      </motion.div>

      <div className="relative w-14 h-14">
        {/* Monkey Avatar SVG with animations */}
        <motion.svg
          viewBox="0 0 140 140"
          className="w-full h-full drop-shadow-md"
          animate={{
            scale: isHovered ? 1.1 : 1,
            y: greetPose ? -2 : (isHovered ? -2 : 0),
          }}
          transition={{
            scale: { type: 'spring', stiffness: 200, damping: 15 },
            y: { duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] }
          }}
        >
          {/* Head - Brown outer circle */}
          <circle cx="70" cy="65" r="38" fill="#8B5A2B" />
          
          {/* Face - Beige inner circle */}
          <circle cx="70" cy="68" r="30" fill="#F5DEB3" />

          {/* Left Ear */}
          <circle cx="34" cy="65" r="12" fill="#8B5A2B" />
          <circle cx="34" cy="65" r="7" fill="#F5DEB3" />
          
          {/* Right Ear */}
          <circle cx="106" cy="65" r="12" fill="#8B5A2B" />
          <circle cx="106" cy="65" r="7" fill="#F5DEB3" />

          {/* EYES - Normal/Idle */}
          {!greetPose && !isHovered && (
            <>
              <circle cx="58" cy="65" r="6" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
              <circle cx="58" cy="65" r="3.5" fill="#000" />
              <circle cx="56" cy="63" r="1.5" fill="#fff" />
              
              <circle cx="82" cy="65" r="6" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
              <circle cx="82" cy="65" r="3.5" fill="#000" />
              <circle cx="80" cy="63" r="1.5" fill="#fff" />
            </>
          )}

          {/* Wide excited eyes - greeting or hover */}
          {(greetPose || isHovered) && (
            <>
              <circle cx="58" cy="63" r="8" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
              <circle cx="58" cy="63" r="4.5" fill="#000" />
              <circle cx="56" cy="61" r="1.8" fill="#fff" />
              
              <circle cx="82" cy="63" r="8" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
              <circle cx="82" cy="63" r="4.5" fill="#000" />
              <circle cx="80" cy="61" r="1.8" fill="#fff" />
              
              {/* Raised eyebrows for excitement */}
              <path d="M50 54 Q58 52 66 54" stroke="#5D3A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M74 54 Q82 52 90 54" stroke="#5D3A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* MOUTH */}
          <path 
            d={greetPose ? "M55 85 Q70 95 85 85" : (isHovered ? "M55 85 Q70 98 85 85" : "M58 88 Q70 92 82 88")}
            stroke="#5D3A1A" 
            strokeWidth="3" 
            fill="none" 
            strokeLinecap="round" 
          />

          {/* Nose */}
          <ellipse cx="70" cy="75" rx="6" ry="5" fill="#5D4037" />

          {/* Blush cheeks */}
          {(greetPose || isHovered) && (
            <>
              <ellipse cx="42" cy="72" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
              <ellipse cx="98" cy="72" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
            </>
          )}

          {/* --- HANDS --- */}
          {/* LEFT HAND */}
          <motion.g
            variants={leftHand}
            animate={waveHand === 'left' ? 'greet' : (greetPose ? 'greetIdle' : handState)}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <ellipse cx="36" cy="85" rx="10" ry="11" fill="#F5DEB3" />
            <ellipse cx="28" cy="78" rx="4" ry="6" fill="#F5DEB3" />
            <ellipse cx="32" cy="72" rx="3" ry="7" fill="#F5DEB3" />
            <ellipse cx="38" cy="70" rx="3" ry="8" fill="#F5DEB3" />
            <ellipse cx="44" cy="72" rx="3" ry="7" fill="#F5DEB3" />
          </motion.g>

          {/* RIGHT HAND */}
          <motion.g
            variants={rightHand}
            animate={waveHand === 'right' ? 'greet' : (greetPose ? 'greetIdle' : handState)}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <ellipse cx="104" cy="85" rx="10" ry="11" fill="#F5DEB3" />
            <ellipse cx="112" cy="78" rx="4" ry="6" fill="#F5DEB3" />
            <ellipse cx="108" cy="70" rx="3" ry="8" fill="#F5DEB3" />
            <ellipse cx="102" cy="72" rx="3" ry="7" fill="#F5DEB3" />
            <ellipse cx="96" cy="72" rx="3" ry="7" fill="#F5DEB3" />
          </motion.g>
        </motion.svg>
      </div>
      
      <div className="flex flex-col">
        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
          Habit<span className="text-blue-600">Master</span>
        </span>
        <motion.div 
          animate={{ width: isHovered ? '100%' : '0%' }}
          className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mt-1 rounded-full"
        />
      </div>
    </div>
  );
}
