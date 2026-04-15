'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationContextType {
  firePaperBlast: () => void;
  fireHeavyCelebrating: () => void;
  celebrateAchievement: (points: number, tier: string) => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export const useCelebration = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
};

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  const firePaperBlast = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#ffffff'],
      disableForReducedMotion: true
    });
  }, []);

  const fireHeavyCelebrating = useCallback(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  }, []);

  const celebrateAchievement = useCallback((points: number, tier: string) => {
    if (tier === 'Gold' || tier === 'Platinum' || tier === 'Diamond' || tier === 'Legendary' || points >= 100) {
      fireHeavyCelebrating();
    } else {
      firePaperBlast();
    }
  }, [firePaperBlast, fireHeavyCelebrating]);

  return (
    <CelebrationContext.Provider value={{ firePaperBlast, fireHeavyCelebrating, celebrateAchievement }}>
      {children}
    </CelebrationContext.Provider>
  );
};
