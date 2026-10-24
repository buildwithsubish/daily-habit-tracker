'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  isDarkMode: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return getSystemPreference();
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    let saved = localStorage.getItem("themeMode") as ThemeMode | null;
    if (!saved) {
      const match = document.cookie.match(/(^|;)\s*themeMode\s*=\s*([^;]+)/);
      if (match && ["light", "dark", "system"].includes(match[2])) {
        saved = match[2] as ThemeMode;
      }
    }
    const activeMode = (saved && ["light", "dark", "system"].includes(saved)) ? saved : "system";
    setModeState(activeMode);
    
    // Check actual DOM class set by blocking head script
    const currentIsDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(currentIsDark);
  }, []);

  const applyTheme = useCallback((targetMode: ThemeMode) => {
    const isDark = resolveIsDark(targetMode);
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    setIsDarkMode(isDark);
    try {
      localStorage.setItem("themeMode", targetMode);
      document.cookie = `themeMode=${targetMode}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    applyTheme(newMode);
  }, [applyTheme]);

  const toggleDarkMode = useCallback(() => {
    setMode(isDarkMode ? "light" : "dark");
  }, [isDarkMode, setMode]);

  useEffect(() => {
    if (!mounted || mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
      setIsDarkMode(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, mounted]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, mode, setMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isDarkMode: false,
      mode: 'system' as ThemeMode,
      setMode: () => {},
      toggleDarkMode: () => {},
    };
  }
  return context;
};
