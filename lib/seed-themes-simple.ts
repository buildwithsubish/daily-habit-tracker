import connectDB from './mongodb';
import Theme from './models/Theme';
import Template from './models/Template';

async function seedThemes() {
  try {
    await connectDB();

    // Clear existing themes and templates
    await Theme.deleteMany({});
    await Template.deleteMany({});

    // Define pre-built themes
    const themes = [
      {
        name: 'classic-light',
        displayName: 'Classic Light',
        description: 'Clean and minimal light theme with professional appearance',
        category: 'light',
        isDefault: true,
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
      },
      {
        name: 'dark-night',
        displayName: 'Dark Night',
        description: 'Elegant dark theme for reduced eye strain',
        category: 'dark',
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#06b6d4',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#cbd5e1',
          border: '#334155',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#06b6d4'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      },
      {
        name: 'nature-green',
        displayName: 'Nature Green',
        description: 'Fresh green theme inspired by nature',
        category: 'nature',
        colors: {
          primary: '#059669',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#f0fdf4',
          surface: '#ecfdf5',
          text: '#064e3b',
          textSecondary: '#6b7280',
          border: '#bbf7d0',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0891b2'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      },
      {
        name: 'ocean-blue',
        displayName: 'Ocean Blue',
        description: 'Refreshing blue theme reminiscent of ocean depths',
        category: 'vibrant',
        colors: {
          primary: '#0ea5e9',
          secondary: '#475569',
          accent: '#06b6d4',
          background: '#f0f9ff',
          surface: '#e0f2fe',
          text: '#0c4a6e',
          textSecondary: '#475569',
          border: '#7dd3fc',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0ea5e9'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      },
      {
        name: 'sunset-orange',
        displayName: 'Sunset Orange',
        description: 'Warm orange theme inspired by beautiful sunsets',
        category: 'vibrant',
        colors: {
          primary: '#ea580c',
          secondary: '#78716c',
          accent: '#f97316',
          background: '#fff7ed',
          surface: '#fed7aa',
          text: '#9a3412',
          textSecondary: '#78716c',
          border: '#fdba74',
          success: '#16a34a',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0ea5e9'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      }
    ];

    // Insert themes
    const createdThemes = await Theme.insertMany(themes);
    console.log(`✅ Created ${createdThemes.length} themes`);

    return {
      themes: createdThemes.length,
      templates: 0
    };
  } catch (error: any) {
    console.error('❌ Failed to seed themes:', error.message);
    throw error;
  }
}

// Export for use in API routes
export { seedThemes as seedThemesSimple };
