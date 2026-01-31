'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface MonkeyAvatarProps {
  isPasswordFocused: boolean;
  isPasswordVisible: boolean;
  isTyping?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  size?: number;
}

export default function MonkeyAvatar({
  isPasswordFocused,
  isPasswordVisible,
  isTyping = false,
  isError = false,
  isSuccess = false,
  size = 120,
}: MonkeyAvatarProps) {
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

  /* Derived states */
  const isHiding = isPasswordFocused && !isPasswordVisible;
  const isPeeking = isPasswordFocused && isPasswordVisible;

  /* Greeting changes */
  useEffect(() => {
    if (isSuccess) {
      setGreeting("YAY! 🎉");
    } else if (isError) {
      setGreeting("Nooo... 😢");
    } else if (isTyping) {
      setGreeting("Typing...");
    } else if (isHiding) {
      setGreeting("🙈 I'm not looking!");
    } else if (isPeeking) {
      setGreeting("👀 Just peeking!");
    }
  }, [isSuccess, isError, isTyping, isHiding, isPeeking]);

  /* ---------------- HAND ANIMATION ---------------- */
  const leftHand = {
    greet: { x: 0, y: 0, rotate: 0 },
    idle: { x: 0, y: 0, rotate: 0 },
    hide: { x: 16, y: -20, rotate: -25 },
    sad: { x: 0, y: 15, rotate: 0 },
    peek: { x: 14, y: -14, rotate: -18 },
    success: { x: 0, y: -28, rotate: 0 },
  };

  const rightHand = {
    greet: { x: 15, y: -22, rotate: 45 },
    greetIdle: { x: 15, y: -15, rotate: 30 },
    idle: { x: 0, y: 0, rotate: 0 },
    hide: { x: -16, y: -20, rotate: 25 },
    sad: { x: 0, y: 15, rotate: 0 },
    peek: { x: -14, y: -14, rotate: 18 },
    success: { x: 0, y: -28, rotate: 0 },
  };

  /* Determine hand state */
  const getHandState = () => {
    if (isSuccess) return 'success';
    if (isError) return 'sad';
    if (greetPose) return 'greet';
    if (isPeeking) return 'peek';
    if (isHiding) return 'hide';
    return 'idle';
  };

  const handState = getHandState();

  /* Jumping animation for success */
  const jumpAnimation = isSuccess ? {
    y: -4,
  } : {};

  /* ---------------- RENDER ---------------- */
  return (
    <motion.div
      animate={jumpAnimation}
      transition={{ duration: 0.5, repeat: isSuccess ? Infinity : 0 }}
      className="relative flex flex-col items-center"
      style={{ width: size, height: size + 30 }}
    >
      {/* Speech Bubble - closer to monkey */}
      <motion.div
        initial={{ opacity: 0, y: -5, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
        className="absolute -top-10 z-20"
      >
        <div className="bg-white dark:bg-slate-800 px-4 py-1.5 rounded-xl shadow-lg border-2 border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white relative whitespace-nowrap">
          {greeting}
          {/* Speech bubble tail */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 rotate-45 border-r-2 border-b-2 border-slate-100 dark:border-slate-700" />
        </div>
      </motion.div>

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className="mt-2"
      >
        {/* Head */}
        <circle cx="60" cy="50" r="32" fill="#8B5A2B" />
        <circle cx="60" cy="53" r="26" fill="#F5DEB3" />

        {/* Ears */}
        <circle cx="26" cy="50" r="10" fill="#8B5A2B" />
        <circle cx="26" cy="50" r="6" fill="#F5DEB3" />
        <circle cx="94" cy="50" r="10" fill="#8B5A2B" />
        <circle cx="94" cy="50" r="6" fill="#F5DEB3" />

        {/* --- EYES SECTION - White with black pupils (constant) --- */}
        {/* Normal eyes - open */}
        {!isHiding && !isError && !isPeeking && !isSuccess && (
          <>
            {/* White eyeballs */}
            <circle cx="48" cy="50" r="6" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
            <circle cx="72" cy="50" r="6" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
            {/* Black pupils */}
            <circle cx="48" cy="50" r="3.5" fill="#000" />
            <circle cx="72" cy="50" r="3.5" fill="#000" />
            {/* Eye shine */}
            <circle cx="46" cy="48" r="1.5" fill="#fff" />
            <circle cx="70" cy="48" r="1.5" fill="#fff" />
          </>
        )}

        {/* Big wide eyes - peeking state (white with black pupils looking down) */}
        {isPeeking && !isError && !isSuccess && (
          <>
            {/* Left eye */}
            <circle cx="48" cy="50" r="7" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
            <circle cx="48" cy="52" r="4" fill="#000" />
            <circle cx="46" cy="51" r="1" fill="#fff" />
            {/* Right eye */}
            <circle cx="72" cy="50" r="7" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
            <circle cx="72" cy="52" r="4" fill="#000" />
            <circle cx="70" cy="51" r="1" fill="#fff" />
          </>
        )}

        {/* Star sparkle eyes - success state */}
        {isSuccess && (
          <>
            <polygon points="48,42 50,48 56,48 51,52 53,58 48,54 43,58 45,52 40,48 46,48" fill="#FFD700" stroke="#FF8C00" strokeWidth="1" />
            <polygon points="72,42 74,48 80,48 75,52 77,58 72,54 67,58 69,52 64,48 70,48" fill="#FFD700" stroke="#FF8C00" strokeWidth="1" />
          </>
        )}

        {/* Closed eyes - hiding (straight lines) */}
        {isHiding && !isError && (
          <>
            <line x1="42" y1="50" x2="54" y2="50" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="66" y1="50" x2="78" y2="50" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* Sad eyes - error state */}
        {isError && (
          <>
            {/* Sad eyebrows */}
            <line x1="40" y1="42" x2="52" y2="46" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="68" y1="46" x2="80" y2="42" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
            {/* Closed sad eyes */}
            <path d="M42 52 Q48 55 54 52" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M66 52 Q72 55 78 52" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* --- MOUTH SECTION --- */}
        {/* Normal smile */}
        {!isError && !isSuccess && (
          <path d="M50 72 Q60 80 70 72" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}

        {/* Sad mouth - error state */}
        {isError && (
          <path d="M48 80 Q60 72 72 80" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}

        {/* Big smile - success state */}
        {isSuccess && (
          <>
            <path d="M46 74 Q60 86 74 74" stroke="#000" strokeWidth="3" fill="#FF6B6B" strokeLinecap="round" />
            <ellipse cx="60" cy="80" rx="8" ry="5" fill="#FF9999" />
          </>
        )}

        {/* Nose */}
        <ellipse cx="60" cy="62" rx="5" ry="4" fill="#5D4037" />

        {/* Blush cheeks */}
        {(isSuccess || greetPose) && (
          <>
            <ellipse cx="32" cy="60" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
            <ellipse cx="88" cy="60" rx="5" ry="3" fill="#FFB6C1" opacity="0.6" />
          </>
        )}

        {/* --- REALISTIC HANDS --- */}
        {/* LEFT HAND - stays idle during greeting, waves only for hide */}
        <motion.g
          variants={leftHand}
          animate={handState}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        >
          {/* Palm */}
          <ellipse cx="28" cy="72" rx="10" ry="11" fill="#F5DEB3" />
          {/* Thumb */}
          <ellipse cx="20" cy="66" rx="4" ry="6" fill="#F5DEB3" />
          {/* Fingers */}
          <ellipse cx="24" cy="62" rx="3" ry="7" fill="#F5DEB3" />
          <ellipse cx="30" cy="60" rx="3" ry="8" fill="#F5DEB3" />
          <ellipse cx="36" cy="62" rx="3" ry="7" fill="#F5DEB3" />
        </motion.g>

        {/* RIGHT HAND - waves during greeting */}
        <motion.g
          variants={rightHand}
          animate={waveHand === 'right' ? 'greet' : (greetPose ? 'greetIdle' : handState)}
          transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        >
          {/* Palm */}
          <ellipse cx="92" cy="72" rx="10" ry="11" fill="#F5DEB3" />
          {/* Thumb */}
          <ellipse cx="100" cy="66" rx="4" ry="6" fill="#F5DEB3" />
          {/* Fingers */}
          <ellipse cx="96" cy="60" rx="3" ry="8" fill="#F5DEB3" />
          <ellipse cx="90" cy="62" rx="3" ry="7" fill="#F5DEB3" />
          <ellipse cx="84" cy="62" rx="3" ry="7" fill="#F5DEB3" />
        </motion.g>
      </svg>
    </motion.div>
  );
}

