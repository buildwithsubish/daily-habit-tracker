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
    const saved = localStorage.getItem("themeMode") as ThemeMode | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      setModeState(saved);
    }
  }, []);

  const applyTheme = useCallback((dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setIsDarkMode(dark);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const isDark = resolveIsDark(mode);
    applyTheme(isDark);
    localStorage.setItem("themeMode", mode);
  }, [mode, applyTheme, mounted]);

  useEffect(() => {
    if (!mounted || mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, applyTheme, mounted]);

  const toggleDarkMode = useCallback(() => {
    setModeState((prev) => resolveIsDark(prev) ? "light" : "dark");
  }, []);

  if (!mounted) {
    // Prevent hydration mismatch by rendering invisible content or fallback
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, mode, setMode: setModeState, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
