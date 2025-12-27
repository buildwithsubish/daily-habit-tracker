'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Palette, Plus, Eye, Edit, Trash2, Save, 
  RefreshCw, CheckCircle, AlertCircle, Settings,
  Upload, X, Image as ImageIcon
} from 'lucide-react';

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
  fonts: {
    heading: string;
    body: string;
  };
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default function ThemeManagement() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'background' | 'accent' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewingThemeId, setPreviewingThemeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    category: 'light' as const,
    backgroundImage: '',
    accentImage: '',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    fonts: {
      heading: 'system-ui',
      body: 'system-ui'
    }
  });

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes?includeCustom=true');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setThemes(data);
    } catch (error) {
      console.error('Failed to fetch themes:', error);
      setMessage({ type: 'error', text: 'Failed to fetch themes' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTheme = async () => {
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Theme created successfully!' });
        setShowCreateForm(false);
        resetForm();
        fetchThemes();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create theme' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create theme' });
    }
  };

  const handleUpdateTheme = async () => {
    if (!editingTheme) return;

    try {
      const res = await fetch(`/api/themes/${editingTheme._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Theme updated successfully! Changes will appear on the main page within seconds.' });
        setEditingTheme(null);
        resetForm();
        fetchThemes();
        
        // Notify other clients of the update via localStorage
        try {
          localStorage.setItem('theme-update-timestamp', Date.now().toString());
        } catch (e) {
          // LocalStorage might be full, ignore
        }
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update theme' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update theme' });
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this theme?')) return;

    try {
      const res = await fetch(`/api/themes/${themeId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Theme deleted successfully!' });
        fetchThemes();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete theme' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete theme' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      category: 'light',
      backgroundImage: '',
      accentImage: '',
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#0ea5e9',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      fonts: {
        heading: 'system-ui',
        body: 'system-ui'
      }
    });
  };

  const startEditing = (theme: Theme) => {
    setEditingTheme(theme);
    setFormData({
      name: theme.name,
      displayName: theme.displayName,
      description: theme.description,
      category: theme.category as any,
      backgroundImage: theme.backgroundImage || '',
      accentImage: theme.accentImage || '',
      colors: theme.colors,
      fonts: theme.fonts
    });
    setShowCreateForm(true);
  };

  const handleImageUpload = async (file: File, type: 'background' | 'accent') => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setUploadingImage(type);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('type', type);

      const res = await fetch('/api/admin/themes/upload-image', {
        method: 'POST',
        body: formDataToSend
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({
          ...formData,
          [type === 'background' ? 'backgroundImage' : 'accentImage']: data.imageUrl
        });
        setMessage({ type: 'success', text: `${type === 'background' ? 'Background' : 'Accent'} image uploaded successfully!` });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to upload image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploadingImage(null);
      setUploadProgress(0);
    }
  };

  const previewTheme = (theme: Theme) => {
    // Show preview in modal only
    setPreviewingThemeId(theme._id);
  };

  const applyTheme = (theme: Theme) => {
    // Apply theme globally to the site
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    localStorage.setItem('selectedTheme', theme.name);
    setMessage({ type: 'success', text: `✅ Theme "${theme.displayName}" applied successfully!` });
    setPreviewingThemeId(null);
  };

  const closePreview = () => {
    setPreviewingThemeId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="text-white" size={28} />
              <h1 className="text-2xl sm:text-3xl font-bold">Theme Management</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                <Settings size={18} />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setEditingTheme(null);
                  resetForm();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
              >
                <Plus size={18} />
                Create Theme
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          </div>
        )}

        {/* Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <div key={theme._id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Theme Preview */}
              <div 
                className="h-24 p-4"
                style={{ 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderBottom: `2px solid ${theme.colors.border}`
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{theme.displayName}</h3>
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
                <p className="text-sm opacity-75 mt-1">{theme.description}</p>
              </div>

              {/* Theme Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {theme.category}
                  </span>
                  {theme.isDefault && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                      Default
                    </span>
                  )}
                  {theme.isCustom && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-600">
                      Custom
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => previewTheme(theme)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                  {!theme.isDefault && (
                    <button
                      onClick={() => startEditing(theme)}
                      className="flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  {theme.isCustom && (
                    <button
                      onClick={() => handleDeleteTheme(theme._id)}
                      className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTheme ? 'Edit Theme' : 'Create New Theme'}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="my-awesome-theme"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="My Awesome Theme"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="A brief description of your theme"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="colorful">Colorful</option>
                    <option value="minimal">Minimal</option>
                    <option value="nature">Nature</option>
                    <option value="vibrant">Vibrant</option>
                  </select>
                </div>

                {/* Color Pickers */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ColorPicker
                      label="Primary"
                      value={formData.colors.primary}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, primary: value}
                      })}
                    />
                    <ColorPicker
                      label="Secondary"
                      value={formData.colors.secondary}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, secondary: value}
                      })}
                    />
                    <ColorPicker
                      label="Accent"
                      value={formData.colors.accent}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, accent: value}
                      })}
                    />
                    <ColorPicker
                      label="Background"
                      value={formData.colors.background}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, background: value}
                      })}
                    />
                    <ColorPicker
                      label="Surface"
                      value={formData.colors.surface}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, surface: value}
                      })}
                    />
                    <ColorPicker
                      label="Text"
                      value={formData.colors.text}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, text: value}
                      })}
                    />
                    <ColorPicker
                      label="Text Secondary"
                      value={formData.colors.textSecondary}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, textSecondary: value}
                      })}
                    />
                    <ColorPicker
                      label="Border"
                      value={formData.colors.border}
                      onChange={(value) => setFormData({
                        ...formData, 
                        colors: {...formData.colors, border: value}
                      })}
                    />
                  </div>
                </div>

                {/* Admin-Only Image Customization */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={20} className="text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Image Customization</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-600">Admin Only</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Upload custom background and accent images for this theme</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Background Image */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Background Image</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {formData.backgroundImage ? (
                          <div className="space-y-3">
                            <img 
                              src={formData.backgroundImage} 
                              alt="Background preview" 
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => setFormData({...formData, backgroundImage: ''})}
                              className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2"
                            >
                              <X size={16} />
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer">
                            <Upload size={24} className="text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'background')}
                              className="hidden"
                              disabled={uploadingImage === 'background'}
                            />
                          </label>
                        )}
                        {uploadingImage === 'background' && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-600 h-2 rounded-full transition-all" 
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 text-center">Uploading...</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Accent Image */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Accent Image</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {formData.accentImage ? (
                          <div className="space-y-3">
                            <img 
                              src={formData.accentImage} 
                              alt="Accent preview" 
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => setFormData({...formData, accentImage: ''})}
                              className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2"
                            >
                              <X size={16} />
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer">
                            <Upload size={24} className="text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Click to upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0], 'accent')}
                              className="hidden"
                              disabled={uploadingImage === 'accent'}
                            />
                          </label>
                        )}
                        {uploadingImage === 'accent' && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-600 h-2 rounded-full transition-all" 
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 text-center">Uploading...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTheme(null);
                  }}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTheme ? handleUpdateTheme : handleCreateTheme}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Save size={16} />
                  {editingTheme ? 'Update Theme' : 'Create Theme'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Theme Preview Modal */}
        {previewingThemeId && themes.find(t => t._id === previewingThemeId) && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              style={{
                backgroundColor: themes.find(t => t._id === previewingThemeId)?.colors.background,
                color: themes.find(t => t._id === previewingThemeId)?.colors.text,
              }}
            >
              {/* Modal Header */}
              <div 
                className="p-6 border-b flex items-center justify-between"
                style={{
                  borderColor: themes.find(t => t._id === previewingThemeId)?.colors.border,
                }}
              >
                <div>
                  <h2 
                    className="text-2xl font-bold"
                    style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.primary }}
                  >
                    {themes.find(t => t._id === previewingThemeId)?.displayName}
                  </h2>
                  <p 
                    className="text-sm mt-1"
                    style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.textSecondary }}
                  >
                    {themes.find(t => t._id === previewingThemeId)?.description}
                  </p>
                </div>
                <button
                  onClick={closePreview}
                  className="p-2 hover:opacity-80 transition-opacity"
                  style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.text }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content - Theme Preview */}
              <div className="p-8 space-y-6">
                {/* Color Palette Preview */}
                <div>
                  <h3 
                    className="text-lg font-semibold mb-4"
                    style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.primary }}
                  >
                    Color Palette
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(themes.find(t => t._id === previewingThemeId)?.colors || {}).map(([key, value]) => (
                      <div key={key} className="flex flex-col items-center gap-2">
                        <div
                          className="w-16 h-16 rounded-lg border-2 shadow-md"
                          style={{
                            backgroundColor: value as string,
                            borderColor: themes.find(t => t._id === previewingThemeId)?.colors.border,
                          }}
                        />
                        <span 
                          className="text-xs font-medium text-center"
                          style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.textSecondary }}
                        >
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample UI Elements */}
                <div>
                  <h3 
                    className="text-lg font-semibold mb-4"
                    style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.primary }}
                  >
                    UI Preview
                  </h3>
                  <div className="space-y-3">
                    <button
                      className="w-full px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: themes.find(t => t._id === previewingThemeId)?.colors.primary,
                        color: themes.find(t => t._id === previewingThemeId)?.colors.background === '#ffffff' ? '#000' : '#fff',
                      }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="w-full px-4 py-2 rounded-lg font-medium border transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: themes.find(t => t._id === previewingThemeId)?.colors.surface,
                        color: themes.find(t => t._id === previewingThemeId)?.colors.text,
                        borderColor: themes.find(t => t._id === previewingThemeId)?.colors.border,
                      }}
                    >
                      Secondary Button
                    </button>
                  </div>
                </div>

                {/* Text Color Preview */}
                <div>
                  <p 
                    className="text-base"
                    style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.text }}
                  >
                    <strong>Main Text:</strong> This is how your main text will look
                  </p>
                  <p 
                    className="text-sm mt-2"
                    style={{ color: themes.find(t => t._id === previewingThemeId)?.colors.textSecondary }}
                  >
                    <strong>Secondary Text:</strong> This is how secondary text will appear
                  </p>
                </div>
              </div>

              {/* Modal Footer - Action Buttons */}
              <div 
                className="p-6 flex gap-3 border-t"
                style={{
                  borderColor: themes.find(t => t._id === previewingThemeId)?.colors.border,
                }}
              >
                <button
                  onClick={closePreview}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: themes.find(t => t._id === previewingThemeId)?.colors.surface,
                    color: themes.find(t => t._id === previewingThemeId)?.colors.text,
                    border: `2px solid ${themes.find(t => t._id === previewingThemeId)?.colors.border}`,
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const theme = themes.find(t => t._id === previewingThemeId);
                    if (theme) applyTheme(theme);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: themes.find(t => t._id === previewingThemeId)?.colors.primary,
                  }}
                >
                  <CheckCircle size={18} />
                  Apply Theme
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
