import connectDB from './mongodb';
import Theme from './models/Theme';
import Template from './models/Template';

export async function seedThemes() {
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
      },
      {
        name: 'royal-purple',
        displayName: 'Royal Purple',
        description: 'Elegant purple theme with royal flair',
        category: 'vibrant',
        colors: {
          primary: '#7c3aed',
          secondary: '#6b7280',
          accent: '#a855f7',
          background: '#faf5ff',
          surface: '#f3e8ff',
          text: '#581c87',
          textSecondary: '#6b7280',
          border: '#c4b5fd',
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
        name: 'rose-pink',
        displayName: 'Rose Pink',
        description: 'Soft pink theme with feminine appeal',
        category: 'colorful',
        colors: {
          primary: '#e11d48',
          secondary: '#64748b',
          accent: '#f472b6',
          background: '#fdf2f8',
          surface: '#fce7f3',
          text: '#881337',
          textSecondary: '#64748b',
          border: '#f9a8d4',
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
        name: 'forest-dark',
        displayName: 'Forest Dark',
        description: 'Deep green dark theme with forest vibes',
        category: 'dark',
        colors: {
          primary: '#059669',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#064e3b',
          surface: '#065f46',
          text: '#d1fae5',
          textSecondary: '#a7f3d0',
          border: '#047857',
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
        name: 'minimal-gray',
        displayName: 'Minimal Gray',
        description: 'Ultra-minimalist gray theme for focus',
        category: 'minimal',
        colors: {
          primary: '#374151',
          secondary: '#6b7280',
          accent: '#9ca3af',
          background: '#f9fafb',
          surface: '#f3f4f6',
          text: '#111827',
          textSecondary: '#6b7280',
          border: '#d1d5db',
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
        name: 'coral-reef',
        displayName: 'Coral Reef',
        description: 'Vibrant coral theme inspired by underwater life',
        category: 'colorful',
        colors: {
          primary: '#dc2626',
          secondary: '#64748b',
          accent: '#fb7185',
          background: '#fef2f2',
          surface: '#fee2e2',
          text: '#991b1b',
          textSecondary: '#64748b',
          border: '#fca5a5',
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
        name: 'sky-dream',
        displayName: 'Sky Dream',
        description: 'Light blue theme with dreamy aesthetics',
        category: 'light',
        colors: {
          primary: '#0284c7',
          secondary: '#64748b',
          accent: '#38bdf8',
          background: '#f0f9ff',
          surface: '#e0f2fe',
          text: '#0c4a6e',
          textSecondary: '#64748b',
          border: '#bae6fd',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0284c7'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      },
      {
        name: 'midnight-purple',
        displayName: 'Midnight Purple',
        description: 'Deep purple dark theme with celestial feel',
        category: 'dark',
        colors: {
          primary: '#8b5cf6',
          secondary: '#a78bfa',
          accent: '#a855f7',
          background: '#1e1b4b',
          surface: '#312e81',
          text: '#e0e7ff',
          textSecondary: '#c7d2fe',
          border: '#6366f1',
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
        name: 'spring-fresh',
        displayName: 'Spring Fresh',
        description: 'Fresh spring theme with pastel colors',
        category: 'colorful',
        colors: {
          primary: '#10b981',
          secondary: '#6b7280',
          accent: '#34d399',
          background: '#f0fdf4',
          surface: '#dcfce7',
          text: '#14532d',
          textSecondary: '#6b7280',
          border: '#bbf7d0',
          success: '#10b981',
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
        name: 'autumn-warm',
        displayName: 'Autumn Warm',
        description: 'Warm autumn theme with earth tones',
        category: 'nature',
        colors: {
          primary: '#d97706',
          secondary: '#78716c',
          accent: '#f59e0b',
          background: '#fffbeb',
          surface: '#fef3c7',
          text: '#92400e',
          textSecondary: '#78716c',
          border: '#fed7aa',
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
        name: 'electric-neon',
        displayName: 'Electric Neon',
        description: 'High-contrast neon theme with electric vibes',
        category: 'vibrant',
        colors: {
          primary: '#06b6d4',
          secondary: '#374151',
          accent: '#22d3ee',
          background: '#083344',
          surface: '#0c4a6e',
          text: '#e0f2fe',
          textSecondary: '#bae6fd',
          border: '#0891b2',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#06b6d4'
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

    // Create default templates
    const templates = [
      {
        name: 'default-dashboard',
        displayName: 'Default Dashboard',
        description: 'Standard dashboard layout for habit tracking',
        category: 'dashboard',
        isDefault: true,
        layout: {
          sections: [
            {
              id: 'header',
              type: 'header',
              position: { x: 0, y: 0 },
              size: { width: 12, height: 1 },
              config: { showTitle: true, showUser: true }
            },
            {
              id: 'stats',
              type: 'stats',
              position: { x: 0, y: 1 },
              size: { width: 12, height: 2 },
              config: { showCompletion: true, showStreak: true, showProgress: true }
            },
            {
              id: 'habits-list',
              type: 'list',
              position: { x: 0, y: 3 },
              size: { width: 12, height: 6 },
              config: { showCategories: true, allowReorder: true }
            }
          ],
          spacing: '1rem',
          containerWidth: '100%'
        }
      },
      {
        name: 'admin-analytics',
        displayName: 'Admin Analytics',
        description: 'Comprehensive analytics dashboard for administrators',
        category: 'admin',
        layout: {
          sections: [
            {
              id: 'header',
              type: 'header',
              position: { x: 0, y: 0 },
              size: { width: 12, height: 1 },
              config: { showTitle: true, showUser: true, showLogout: true }
            },
            {
              id: 'user-stats',
              type: 'stats',
              position: { x: 0, y: 1 },
              size: { width: 12, height: 2 },
              config: { showTotalUsers: true, showActiveUsers: true, showNewUsers: true }
            },
            {
              id: 'activity-chart',
              type: 'chart',
              position: { x: 0, y: 3 },
              size: { width: 8, height: 4 },
              config: { chartType: 'line', showTrend: true }
            },
            {
              id: 'top-habits',
              type: 'list',
              position: { x: 8, y: 3 },
              size: { width: 4, height: 4 },
              config: { showRanking: true, limit: 10 }
            }
          ],
          spacing: '1rem',
          containerWidth: '100%'
        }
      }
    ];

    // Insert templates
    const createdTemplates = await Template.insertMany(templates);
    console.log(`✅ Created ${createdTemplates.length} templates`);

    return {
      themes: createdThemes.length,
      templates: createdTemplates.length
    };
  } catch (error: any) {
    console.error('❌ Failed to seed themes:', error.message);
    throw error;
  }
}

// Allow running as script
if (require.main === module) {
  seedThemes()
    .then((result) => {
      console.log('✅ Theme seeding complete:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Theme seeding failed:', error);
      process.exit(1);
    });
}
