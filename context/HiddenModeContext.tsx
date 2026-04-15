'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface HiddenModeContextType {
  isHiddenMode: boolean;
  toggleHiddenMode: () => void;
}

const HiddenModeContext = createContext<HiddenModeContextType | undefined>(undefined);

export function HiddenModeProvider({ children }: { children: React.ReactNode }) {
  const [isHiddenMode, setIsHiddenMode] = useState(false);

  const toggleHiddenMode = () => {
    setIsHiddenMode((prev) => {
      const next = !prev;
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
      return next;
    });
  };

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
