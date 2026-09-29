'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface HiddenModeContextType {
  isHiddenMode: boolean;
  toggleHiddenMode: () => void;
}

const HiddenModeContext = createContext<HiddenModeContextType | undefined>(undefined);

export function HiddenModeProvider({ children }: { children: React.ReactNode }) {
  const [isHiddenMode, setIsHiddenMode] = useState(false);

  // Auto-reset Hidden Mode after 5 minutes of inactivity if active
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isHiddenMode) {
      timeoutId = setTimeout(() => {
        setIsHiddenMode(false);
        toast('Hidden Mode Reset (Security)', {
          icon: '🔒',
          style: {
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 'bold',
          },
        });
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isHiddenMode]);

  const toggleHiddenMode = useCallback(() => {
    const next = !isHiddenMode;
    setIsHiddenMode(next);

    if (next) {
      toast.success('Hidden Mode Activated', {
          icon: '🕵️',
          style: {
            borderRadius: '16px',
            background: '#18181b',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '13px',
            border: '1px solid #27272a'
          },
      });
    } else {
      toast('Hidden Mode Deactivated', {
          icon: '👁️',
          style: {
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 'bold',
          },
      });
    }
  }, [isHiddenMode]);

  return (
    <HiddenModeContext.Provider value={{ isHiddenMode, toggleHiddenMode }}>
      {children}
    </HiddenModeContext.Provider>
  );
}

export function useHiddenMode() {
  const context = useContext(HiddenModeContext);
  if (context === undefined) {
    throw new Error('useHiddenMode must be used within a HiddenModeProvider');
  }
  return context;
}
