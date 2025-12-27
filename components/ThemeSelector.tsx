'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, RefreshCw } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface Theme {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  isDefault?: boolean;
  colors: {
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
  };
}

export default function ThemeSelector() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { themes: availableThemes, currentTheme } = useTheme();

  useEffect(() => {
    // Use themes from context instead of making separate API calls
    if (availableThemes.length > 0) {
      setThemes(availableThemes);
      setLoading(false);
    }
    
    // Set selected theme from context
    if (currentTheme?._id) {
      setSelectedTheme(currentTheme._id);
    }
  }, [availableThemes, currentTheme]);

  const applyTheme = async (themeId: string) => {
    setApplying(true);
    try {
      const res = await fetch('/api/users/theme', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTheme(themeId);
        setMessage({ type: 'success', text: data.message });
        
        // Apply theme to UI with all colors
        const theme = themes.find(t => t._id === themeId);
        if (theme) {
          const root = document.documentElement;
          // Apply all color properties to CSS custom properties
          Object.entries(theme.colors).forEach(([key, value]) => {
            if (typeof value === 'string') {
              const cssVariableName = `--color-${key}`;
              root.style.setProperty(cssVariableName, value);
              console.log(`Applied ${cssVariableName}: ${value}`);
            }
          });
        }
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to apply theme' });
      }
    } catch (error) {
      console.error('Theme application error:', error);
      setMessage({ type: 'error', text: 'Failed to apply theme' });
    } finally {
      setApplying(false);
    }
  };

  const revertToDefault = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/users/theme', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useDefault: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTheme(null);
        setMessage({ type: 'success', text: data.message });
        
        // Apply default theme to UI
        if (data.theme) {
          const root = document.documentElement;
          Object.entries(data.theme.colors).forEach(([key, value]: [string, unknown]) => {
            if (typeof value === 'string') {
              root.style.setProperty(`--color-${key}`, value);
              console.log(`Applied default --color-${key}: ${value}`);
            }
          });
        }
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to revert theme' });
      }
    } catch (error) {
      console.error('Revert theme error:', error);
      setMessage({ type: 'error', text: 'Failed to revert theme' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Palette className="text-red-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Personalize Your Theme</h2>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <div
            key={theme._id}
            className={`relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer border-2 ${
              selectedTheme === theme._id
                ? 'border-red-600 ring-2 ring-red-300'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => applyTheme(theme._id)}
          >
            {/* Theme Preview */}
            <div
              className="h-24 p-4 flex flex-col justify-between"
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
              }}
            >
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: theme.colors.primary }}
                >
                  {theme.displayName}
                </h3>
                <p
                  className="text-xs mt-1"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {theme.description}
                </p>
              </div>
              <div className="flex gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: theme.colors.accent }}
                />
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedTheme === theme._id && (
              <div className="absolute top-3 right-3 bg-red-600 text-white rounded-full p-2">
                <Check size={20} />
              </div>
            )}

            {/* Default Badge */}
            {theme.isDefault && (
              <div className="absolute bottom-3 left-3">
                <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  Default
                </span>
              </div>
            )}

            {/* Apply Button */}
            <div className="p-4 bg-white border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  applyTheme(theme._id);
                }}
                disabled={applying || selectedTheme === theme._id}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${
                  selectedTheme === theme._id
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {selectedTheme === theme._id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={16} />
                    Applied
                  </span>
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Revert to Default Button */}
      {selectedTheme && (
        <div className="flex justify-center pt-4">
          <button
            onClick={revertToDefault}
            disabled={applying}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            <RefreshCw size={18} />
            Revert to Default Theme
          </button>
        </div>
      )}
    </div>
  );
}
