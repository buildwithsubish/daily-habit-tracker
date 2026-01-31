'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Star, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CompletionCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export default function CompletionCelebration({ isVisible, onComplete }: CompletionCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate random particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          {/* Central Burst */}
          <motion.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
            className="absolute"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 opacity-90 blur-xl" />
          </motion.div>

          {/* Icon Explosion */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
            className="relative z-10"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <Trophy size={48} className="text-white" />
            </div>
          </motion.div>

          {/* Particle Explosion */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                scale: 0,
                x: 0,
                y: 0,
                opacity: 1
              }}
              animate={{
                scale: [0, 1, 0],
                x: (particle.x - 50) * 4,
                y: (particle.y - 50) * 4,
                opacity: [1, 1, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 1.5,
                delay: particle.delay,
                ease: "easeOut"
              }}
              className="absolute"
            >
              {particle.id % 4 === 0 ? (
                <Sparkles size={20} className="text-yellow-400" />
              ) : particle.id % 4 === 1 ? (
                <Star size={16} className="text-orange-400 fill-orange-400" />
              ) : particle.id % 4 === 2 ? (
                <Zap size={18} className="text-pink-400" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-indigo-400" />
              )}
            </motion.div>
          ))}

          {/* Ripple Effects */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                repeat: 1,
                ease: "easeOut"
              }}
              className="absolute w-32 h-32 rounded-full border-4 border-indigo-400"
            />
          ))}

          {/* Confetti */}
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: '50%',
                y: '50%',
                scale: 0,
                opacity: 1
              }}
              animate={{
                x: `${50 + (Math.random() - 0.5) * 200}%`,
                y: `${50 + (Math.random() - 0.5) * 200}%`,
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 2,
                delay: Math.random() * 0.5,
                ease: "easeOut"
              }}
              className="absolute"
              style={{
                width: Math.random() * 8 + 4,
                height: Math.random() * 8 + 4,
                backgroundColor: ['#fbbf24', '#f97316', '#ec4899', '#8b5cf6', '#3b82f6'][Math.floor(Math.random() * 5)],
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
