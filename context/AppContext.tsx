'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AppContextType {
  advancedMode: boolean;
  setAdvancedMode: (enabled: boolean) => void;
  toggleAdvancedMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [advancedMode, setAdvancedModeState] = useState<boolean>(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('advancedMode');
    if (saved !== null) {
      setAdvancedModeState(saved === 'true');
    }
  }, []);

  const setAdvancedMode = useCallback((enabled: boolean) => {
    setAdvancedModeState(enabled);
    localStorage.setItem('advancedMode', String(enabled));
  }, []);

  const toggleAdvancedMode = useCallback(() => {
    setAdvancedModeState((prev) => {
      const next = !prev;
      localStorage.setItem('advancedMode', String(next));
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ advancedMode, setAdvancedMode, toggleAdvancedMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
