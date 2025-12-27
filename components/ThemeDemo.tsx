'use client';

import { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Palette, Eye, Download, RefreshCw } from 'lucide-react';

export default function ThemeDemo() {
  const { currentTheme, themes, setTheme, loading, refreshThemes } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update selectedTheme when currentTheme changes
  useEffect(() => {
    setSelectedTheme(currentTheme);
  }, [currentTheme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  const handleThemeChange = (themeName: string) => {
    setTheme(themeName);
    const theme = themes.find((t: any) => t.name === themeName);
    setSelectedTheme(theme || null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshThemes();
    setIsRefreshing(false);
  };

  const previewTheme = (theme: any) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties temporarily
    const originalValues: Record<string, string> = {};
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--color-${key}`;
      originalValues[cssVar] = root.style.getPropertyValue(cssVar);
      root.style.setProperty(cssVar, value as string);
    });
    
    // Restore after 2 seconds
    setTimeout(() => {
      Object.entries(originalValues).forEach(([cssVar, value]) => {
        root.style.setProperty(cssVar, value);
      });
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Current Theme Display */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6" />
            Theme System Demo
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh themes"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {currentTheme && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme Info */}
            <div>
              <h3 className="text-lg font-semibold mb-2">{currentTheme.displayName}</h3>
              <p className="text-sm opacity-80 mb-4">{currentTheme.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs rounded-full bg-white/20">
                  {currentTheme.category}
                </span>
                {currentTheme.isDefault && (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20">
                    Default
                  </span>
                )}
                {currentTheme.isCustom && (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-500/20">
                    Custom
                  </span>
                )}
              </div>
            </div>
            
            {/* Color Palette */}
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(currentTheme.colors).map(([key, value]: [string, any]) => (
                <div key={key} className="text-center">
                  <div
                    className="w-8 h-8 rounded border border-white/20 mx-auto mb-1"
                    style={{ backgroundColor: value as string }}
                    title={`${key}: ${value}`}
                  />
                  <span className="text-xs opacity-70">{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme: any) => (
          <div
            key={theme._id}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
            onClick={() => handleThemeChange(theme.name)}
          >
            {/* Theme Preview Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{theme.displayName}</h4>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    previewTheme(theme);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="Preview theme"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
            
            {/* Color Palette Preview */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {Object.entries(theme.colors).slice(0, 8).map(([key, value]: [string, any]) => (
                <div
                  key={key}
                  className="w-4 h-4 rounded border border-white/20"
                  style={{ backgroundColor: value as string }}
                  title={`${key}: ${value}`}
                />
              ))}
            </div>
            
            {/* Theme Description */}
            <p className="text-xs opacity-70 mb-3 line-clamp-2">
              {theme.description}
            </p>
            
            {/* Theme Status Badges */}
            <div className="flex gap-1 mb-3 text-xs">
              {theme.isDefault && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200">
                  Default
                </span>
              )}
              {theme.isCustom && (
                <span className="px-1.5 py-0.5 rounded-full bg-green-500/30 text-green-200">
                  Custom
                </span>
              )}
            </div>
            
            {/* Apply Button */}
            <button
              onClick={() => handleThemeChange(theme.name)}
              className="w-full py-2 px-3 text-sm rounded-lg border border-white/20 hover:bg-white/10 transition-all font-medium"
              style={{
                backgroundColor: currentTheme?.name === theme.name ? 'var(--color-primary)' : 'transparent',
                color: currentTheme?.name === theme.name ? 'white' : 'inherit'
              }}
            >
              {currentTheme?.name === theme.name ? 'Active' : 'Apply Theme'}
            </button>
          </div>
        ))}
      </div>

      {/* CSS Variables Display */}
      {currentTheme && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold mb-4">CSS Variables Applied</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currentTheme.colors).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-mono">--color-{key}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border border-white/20"
                    style={{ backgroundColor: value as string }}
                  />
                  <span className="text-sm font-mono">{value as string}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
