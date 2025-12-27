'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, Eye, Copy } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPresets?: boolean;
  presetColors?: string[];
}

const DEFAULT_PRESETS = [
  // Classic colors
  '#000000', '#ffffff', '#2563eb', '#dc2626', '#059669', '#d97706',
  '#7c3aed', '#ec4899', '#0891b2', '#6b7280', '#374151', '#f59e0b',
  
  // Blues
  '#1e40af', '#3b82f6', '#0ea5e9', '#06b6d4', '#0284c7', '#1e3a8a',
  
  // Reds
  '#b91c1c', '#ef4444', '#f87171', '#dc2626', '#991b1b', '#7f1d1d',
  
  // Greens
  '#047857', '#10b981', '#34d399', '#059669', '#065f46', '#064e3b',
  
  // Oranges
  '#ea580c', '#f97316', '#fb923c', '#d97706', '#92400e', '#78350f',
  
  // Purples
  '#6d28d9', '#8b5cf6', '#a855f7', '#7c3aed', '#5b21b6', '#4c1d95',
  
  // Pinks
  '#be185d', '#ec4899', '#f472b6', '#e11d48', '#9f1239', '#881337',
  
  // Earth tones
  '#92400e', '#a16207', '#ca8a04', '#78716c', '#57534e', '#44403c',
];

export default function ColorPicker({ 
  label, 
  value, 
  onChange, 
  showPresets = true,
  presetColors = DEFAULT_PRESETS 
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColorInput = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const handlePresetClick = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
  };

  const getColorFromHSL = () => {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const handleHSLChange = (newHue: number, newSat: number, newLight: number) => {
    setHue(newHue);
    setSaturation(newSat);
    setLightness(newLight);
    const hslColor = `hsl(${newHue}, ${newSat}%, ${newLight}%)`;
    onChange(hslColor);
    setCustomColor(hslColor);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {/* Color Display */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-10 border-2 border-gray-300 rounded cursor-pointer hover:border-gray-400 transition-colors relative overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-black/20" />
        </button>
        
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => handleColorInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            placeholder="#000000"
          />
        </div>
        
        <button
          onClick={copyToClipboard}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Copy color"
        >
          <Copy size={16} />
        </button>
      </div>

      {/* Color Picker Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-4 z-50 min-w-80">
          <div className="space-y-4">
            {/* Color Preview */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: value }}
                />
                <span className="font-mono text-sm">{value}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* HSL Sliders */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hue: {hue}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hue}
                  onChange={(e) => handleHSLChange(parseInt(e.target.value), saturation, lightness)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(0, 100%, 50%), 
                      hsl(60, 100%, 50%), 
                      hsl(120, 100%, 50%), 
                      hsl(180, 100%, 50%), 
                      hsl(240, 100%, 50%), 
                      hsl(300, 100%, 50%), 
                      hsl(360, 100%, 50%)
                    )`
                  }}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Saturation: {saturation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={saturation}
                  onChange={(e) => handleHSLChange(hue, parseInt(e.target.value), lightness)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(${hue}, 0%, ${lightness}%), 
                      hsl(${hue}, 100%, ${lightness}%)
                    )`
                  }}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Lightness: {lightness}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={lightness}
                  onChange={(e) => handleHSLChange(hue, saturation, parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(${hue}, ${saturation}%, 0%), 
                      hsl(${hue}, ${saturation}%, 50%), 
                      hsl(${hue}, ${saturation}%, 100%)
                    )`
                  }}
                />
              </div>
            </div>

            {/* Color Input */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Custom Color
              </label>
              <input
                type="color"
                value={value}
                onChange={(e) => handleColorInput(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>

            {/* Preset Colors */}
            {showPresets && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Preset Colors
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                  {presetColors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetClick(color)}
                      className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                        value === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Done
              </button>
              <button
                onClick={() => {
                  const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
                  onChange(randomColor);
                  setCustomColor(randomColor);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
              >
                <Palette size={14} />
                Random
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
