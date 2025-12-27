'use client';

import { useState, useEffect } from 'react';
import { Palette, Copy, Check, AlertCircle, Zap, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Theme {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  colors: Record<string, string>;
}

interface Preset {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  type: string;
  habits?: any[];
}

export default function PresetsTemplatesPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'themes' | 'presets'>('themes');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPresetsAndTemplates();
  }, []);

  const fetchPresetsAndTemplates = async () => {
    try {
      const res = await fetch('/api/presets-templates');
      const data = await res.json();
      setThemes(data.themes || []);
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      setMessage({ type: 'error', text: 'Failed to load presets and templates' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyTheme = async (themeName: string, themeId: string) => {
    setApplyingId(themeId);
    try {
      const res = await fetch('/api/themes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ themeName })
      });

      const data = await res.json();

      if (res.ok) {
        setAppliedId(themeId);
        setMessage({ type: 'success', text: `✅ ${data.message}` });
        
        // Update localStorage to notify other components
        try {
          localStorage.setItem('theme-update-timestamp', Date.now().toString());
          localStorage.setItem('applied-theme', themeName);
        } catch (e) {
          // localStorage might be full
        }

        setTimeout(() => {
          setAppliedId(null);
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error || 'Failed to apply theme'}` });
      }
    } catch (error) {
      console.error('Error applying theme:', error);
      setMessage({ type: 'error', text: '❌ An error occurred' });
    } finally {
      setApplyingId(null);
    }
  };

  const handleApplyPreset = async (presetName: string, presetId: string) => {
    setApplyingId(presetId);
    try {
      const res = await fetch('/api/presets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ presetName })
      });

      const data = await res.json();

      if (res.ok) {
        setAppliedId(presetId);
        setMessage({ type: 'success', text: `✅ ${data.message}` });

        setTimeout(() => {
          setAppliedId(null);
          setMessage(null);
          // Redirect to habits page
          router.push('/dashboard/habits');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: `❌ ${data.error || 'Failed to apply preset'}` });
      }
    } catch (error) {
      console.error('Error applying preset:', error);
      setMessage({ type: 'error', text: '❌ An error occurred' });
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Palette className="w-8 h-8" />
            <h1 className="text-3xl sm:text-4xl font-bold">Presets & Templates</h1>
          </div>
          <p className="text-sm opacity-90">Explore our collection of pre-built themes and habit templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-3 mb-8 border-b">
          <button
            onClick={() => setSelectedTab('themes')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              selectedTab === 'themes'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Palette className="inline mr-2" size={18} />
            Themes ({themes.length})
          </button>
          <button
            onClick={() => setSelectedTab('presets')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              selectedTab === 'presets'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="inline mr-2" size={18} />
            Templates ({presets.length})
          </button>
        </div>

        {/* Themes Section */}
        {selectedTab === 'themes' && (
          <div>
            {/* Message Alert */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <Check size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  {message.text}
                </div>
              </div>
            )}

            {themes.length === 0 ? (
              <div className="flex items-center justify-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <AlertCircle className="mr-3 text-gray-400" />
                <p className="text-gray-600">No preset themes available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((theme) => (
                  <div
                    key={theme._id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
                  >
                    {/* Theme Preview */}
                    <div
                      className="h-32 p-4 flex items-center justify-center"
                      style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
                    >
                      <div className="text-center">
                        <h3 className="font-bold text-lg mb-2">{theme.displayName}</h3>
                        <div className="flex gap-2 justify-center">
                          {Object.entries(theme.colors)
                            .slice(0, 5)
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="w-5 h-5 rounded-full border-2 border-gray-300"
                                style={{ backgroundColor: value }}
                                title={key}
                              />
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-3">{theme.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          {theme.category}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          Default
                        </span>
                      </div>

                      {/* Color Grid */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Colors:</p>
                        <div className="grid grid-cols-6 gap-1">
                          {Object.entries(theme.colors).map(([key, value]) => (
                            <div
                              key={key}
                              className="relative group"
                              title={`${key}: ${value}`}
                            >
                              <div
                                className="w-full aspect-square rounded border border-gray-300 cursor-pointer"
                                style={{ backgroundColor: value }}
                              />
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {key}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => handleApplyTheme(theme.name, theme._id)}
                          disabled={applyingId === theme._id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {appliedId === theme._id ? (
                            <>
                              <Check size={16} />
                              Applied!
                            </>
                          ) : applyingId === theme._id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Apply Theme
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(theme.colors, null, 2), theme._id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm"
                        >
                          {copiedId === theme._id ? (
                            <>
                              <Check size={16} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={16} />
                              Copy Colors
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Presets Section */}
        {selectedTab === 'presets' && (
          <div>
            {/* Message Alert */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? (
                    <Check size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  {message.text}
                </div>
              </div>
            )}

            {presets.length === 0 ? (
              <div className="flex items-center justify-center p-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <AlertCircle className="mr-3 text-gray-400" />
                <p className="text-gray-600">No preset templates available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {presets.map((preset) => (
                  <div
                    key={preset._id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{preset.displayName}</h3>
                      <p className="text-sm text-gray-600 mb-4">{preset.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {preset.category || preset.type}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          {preset.habits?.length || 0} Habits
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => handleApplyPreset(preset.name, preset._id)}
                          disabled={applyingId === preset._id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {appliedId === preset._id ? (
                            <>
                              <Check size={16} />
                              Applied!
                            </>
                          ) : applyingId === preset._id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Apply Template
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(preset.name, preset._id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm"
                        >
                          {copiedId === preset._id ? (
                            <>
                              <Check size={16} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={16} />
                              Copy Name
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">About Presets & Templates</h3>
          <p className="text-blue-800 text-sm">
            These are pre-built themes and habit templates that you can use to quickly customize your experience. 
            Themes control the visual appearance with color schemes, while templates provide starter habit collections 
            for different goals and lifestyles.
          </p>
        </div>
      </div>
    </div>
  );
}
