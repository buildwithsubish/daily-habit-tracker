'use client';

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <motion.button
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="relative w-[56px] h-[28px] rounded-full p-[3px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shrink-0"
      animate={{
        backgroundColor: isDarkMode ? "#1e1b4b" : "#7dd3fc",
        boxShadow: isDarkMode
          ? "inset 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)"
          : "inset 0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(56,189,248,0.3)",
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
    >
      {/* Track decorations — stars (dark) */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        animate={{ opacity: isDarkMode ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {[
          { t: "6px", l: "8px", s: 2 },
          { t: "16px", l: "14px", s: 1.5 },
          { t: "10px", l: "22px", s: 1 },
          { t: "18px", l: "6px", s: 1 },
        ].map((star, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            className="absolute bg-white rounded-full"
            style={{ top: star.t, left: star.l, width: star.s, height: star.s }}
          />
        ))}
      </motion.div>

      {/* Track decorations — clouds (light) */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        animate={{ opacity: isDarkMode ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="absolute bg-white/50 rounded-full"
          style={{ top: "8px", right: "10px", width: 10, height: 5, filter: "blur(0.5px)" }}
        />
        <div
          className="absolute bg-white/35 rounded-full"
          style={{ top: "16px", right: "18px", width: 7, height: 3.5, filter: "blur(0.5px)" }}
        />
      </motion.div>

      {/* Knob */}
      <motion.div
        animate={{ x: isDarkMode ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center p-[1px]"
      >
        <div className="relative w-full h-full">
          {/* Sun */}
          <motion.div
            animate={{ 
              opacity: isDarkMode ? 0 : 1,
              scale: isDarkMode ? 0.3 : 1,
              rotate: isDarkMode ? 90 : 0
            }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 35%, #fef08a, #f59e0b)",
              boxShadow: "0 0 8px 2px rgba(251,191,36,0.5), 0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              viewBox="0 0 22 22"
              className="w-full h-full"
            >
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <line
                  key={deg}
                  x1="11" y1="1.5" x2="11" y2="4"
                  stroke="rgba(245,158,11,0.45)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 11 11)`}
                />
              ))}
            </motion.svg>
          </motion.div>

          {/* Moon */}
          <motion.div
            animate={{ 
              opacity: isDarkMode ? 1 : 0,
              scale: isDarkMode ? 1 : 0.3,
              rotate: isDarkMode ? 0 : -90
            }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: "radial-gradient(circle at 40% 40%, #f1f5f9, #94a3b8)",
              boxShadow: "0 0 8px 2px rgba(226,232,240,0.3), 0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                top: "15%", right: "5%", width: "55%", height: "55%",
                background: "radial-gradient(circle, rgba(30,27,75,0.3), transparent)",
              }}
            />
            <div className="absolute rounded-full" style={{ top: "30%", left: "22%", width: 3, height: 3, background: "rgba(148,163,184,0.4)" }} />
            <div className="absolute rounded-full" style={{ top: "55%", left: "52%", width: 2, height: 2, background: "rgba(148,163,184,0.3)" }} />
          </motion.div>
        </div>
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
