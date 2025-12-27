'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface Theme {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isDefault: boolean;
  isCustom: boolean;
  backgroundImage?: string;
  accentImage?: string;
  colors: ThemeColors;
  fonts: {
    heading: string;
    body: string;
  };
  updatedAt?: Date;
}

interface ThemeContextType {
  currentTheme: Theme | null;
  themes: Theme[];
  setTheme: (themeName: string) => void;
  loading: boolean;
  refreshThemes: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Apply theme function - memoized to prevent unnecessary re-renders
  const applyTheme = useCallback((theme: Theme) => {
    if (!theme) return;
    
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value);
      }
    });
    
    // Apply fonts
    if (theme.fonts) {
      root.style.setProperty('--font-heading', theme.fonts.heading);
      root.style.setProperty('--font-body', theme.fonts.body);
    }

    // Apply background image if available
    if (theme.backgroundImage) {
      root.style.backgroundImage = `url('${theme.backgroundImage}')`;
      root.style.backgroundAttachment = 'fixed';
      root.style.backgroundSize = 'cover';
      root.style.backgroundPosition = 'center';
    } else {
      root.style.backgroundImage = 'none';
    }

    // Apply accent image if available
    if (theme.accentImage) {
      root.style.setProperty('--accent-image', `url('${theme.accentImage}')`);
    } else {
      root.style.setProperty('--accent-image', 'none');
    }
  }, []);

  // Initialize themes only once - this is the key fix for infinite loops
  const initializeThemes = useCallback(async () => {
    if (initialized) return;
    
    try {
      setLoading(true);
      
      // Fetch all available themes
      const themesRes = await fetch('/api/themes?includeCustom=true');
      const themesData = await themesRes.json();
      setThemes(themesData);

      // Try to load user's preferred theme
      try {
        const userThemeRes = await fetch('/api/users/theme');
        if (userThemeRes.ok) {
          const userThemeData = await userThemeRes.json();
          if (userThemeData.theme) {
            applyTheme(userThemeData.theme);
            setCurrentTheme(userThemeData.theme);
            setInitialized(true);
            return;
          }
        }
      } catch (e) {
        console.log('User theme fetch failed, using default theme');
      }
      
      // Fall back to default theme
      const defaultTheme = themesData.find((theme: Theme) => theme.isDefault) || themesData[0];
      if (defaultTheme) {
        applyTheme(defaultTheme);
        setCurrentTheme(defaultTheme);
      }
      
      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize themes:', error);
      setInitialized(true); // Prevent infinite retries
    } finally {
      setLoading(false);
    }
  }, [applyTheme, initialized]);

  // Initialize themes only once on mount
  useEffect(() => {
    initializeThemes();
  }, [initializeThemes]);

  const setCurrentThemeName = async (themeName: string) => {
    try {
      const theme = themes.find(t => t.name === themeName);
      if (theme) {
        setCurrentTheme(theme);
        applyTheme(theme);
        localStorage.setItem('habit-tracker-theme', themeName);
      }
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  const setTheme = (themeName: string) => {
    setCurrentThemeName(themeName);
  };

  // Only refresh themes when explicitly called, not on interval
  const refreshThemes = useCallback(async () => {
    try {
      const res = await fetch('/api/themes?includeCustom=true');
      const data = await res.json();
      setThemes(data);
      
      // If we have a current theme, make sure it still exists in the new themes list
      if (currentTheme) {
        const updatedTheme = data.find((t: Theme) => t._id === currentTheme._id);
        if (updatedTheme) {
          setCurrentTheme(updatedTheme);
          applyTheme(updatedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to refresh themes:', error);
    }
  }, [currentTheme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, themes, setTheme, loading, refreshThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
