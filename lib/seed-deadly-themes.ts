import connectDB from './mongodb';
import Theme from './models/Theme';

async function seedDeadlyThemes() {
  try {
    await connectDB();

    // Researched deadly color combinations based on actual dark/ominous design palettes
    const deadlyThemes = [
      {
        name: 'blood-night',
        displayName: 'Blood Night',
        description: 'Pure black with blood red accents',
        category: 'dark' as const,
        isDefault: true,
        isCustom: false,
        colors: {
          primary: '#dc143c',
          secondary: '#0a0a0a',
          accent: '#ff1744',
          background: '#000000',
          surface: '#1a1a1a',
          text: '#f0f0f0',
          textSecondary: '#c0c0c0',
          border: '#2a2a2a',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#00ddff'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      },
      {
        name: 'crimson-void',
        displayName: 'Crimson Void',
        description: 'Charcoal black with crimson red',
        category: 'dark' as const,
        isDefault: false,
        isCustom: false,
        colors: {
          primary: '#c41e3a',
          secondary: '#0d0d0d',
          accent: '#e60000',
          background: '#0d0d0d',
          surface: '#1d1d1d',
          text: '#e8e8e8',
          textSecondary: '#b8b8b8',
          border: '#2d2d2d',
          success: '#1eff6a',
          warning: '#ffb700',
          error: '#ff3333',
          info: '#00ccff'
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui'
        }
      },
      {
        name: 'midnight-scarlet',
        displayName: 'Midnight Scarlet',
        description: 'Navy darkness with scarlet red',
        category: 'dark' as const,
        colors: {
          primary: '#a71c48',
          secondary: '#0f1419',
          accent: '#d32f2f',
          background: '#0f1419',
          surface: '#1f2937',
          text: '#e0e0e0',
          textSecondary: '#b0b0b0',
          border: '#323232',
          success: '#00ff66',
          warning: '#ffb300',
          error: '#ff5555',
          info: '#00bbff'
        }
      },
      {
        name: 'obsidian-rage',
        displayName: 'Obsidian Rage',
        description: 'Polished obsidian with scarlet fury',
        category: 'dark' as const,
        colors: {
          primary: '#ff0000',
          secondary: '#121212',
          accent: '#ff5252',
          background: '#050505',
          surface: '#1e1e1e',
          text: '#ffffff',
          textSecondary: '#b0b0b0',
          border: '#2d2d2d',
          success: '#00ff99',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#00e5ff'
        }
      },
      {
        name: 'shadow-purple',
        displayName: 'Shadow Purple',
        description: 'Deep purple merged with absolute black',
        category: 'dark' as const,
        colors: {
          primary: '#7c2d66',
          secondary: '#0a0a0a',
          accent: '#c244a4',
          background: '#0a0a0a',
          surface: '#1a1a1a',
          text: '#e6e6e6',
          textSecondary: '#b8b8b8',
          border: '#2a2a2a',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff6666',
          info: '#00d9ff'
        }
      },
      {
        name: 'inferno-black',
        displayName: 'Inferno Black',
        description: 'Lava orange on pitch black',
        category: 'dark' as const,
        colors: {
          primary: '#ff5722',
          secondary: '#121212',
          accent: '#ff8844',
          background: '#0c0c0c',
          surface: '#1d1d1d',
          text: '#f5f5f5',
          textSecondary: '#c8c8c8',
          border: '#2a2a2a',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00e0ff'
        }
      },
      {
        name: 'shadow-crimson',
        displayName: 'Shadow Crimson',
        description: 'Deep gray shadow with crimson highlights',
        category: 'dark' as const,
        colors: {
          primary: '#c41e3a',
          secondary: '#1c1c1c',
          accent: '#e91e63',
          background: '#1a1a1a',
          surface: '#252525',
          text: '#f0f0f0',
          textSecondary: '#c0c0c0',
          border: '#333333',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00d9ff'
        }
      },
      {
        name: 'rust-blood',
        displayName: 'Rust & Blood',
        description: 'Rusty brown merged with blood red',
        category: 'dark' as const,
        colors: {
          primary: '#8b0000',
          secondary: '#140c0c',
          accent: '#cc0000',
          background: '#0d0605',
          surface: '#1f1818',
          text: '#e8e8e8',
          textSecondary: '#b8b8b8',
          border: '#2d2525',
          success: '#00ff66',
          warning: '#ffb700',
          error: '#ff6666',
          info: '#00d9ff'
        }
      },
      {
        name: 'cold-void',
        displayName: 'Cold Void',
        description: 'Icy teal on absolute void black',
        category: 'dark' as const,
        colors: {
          primary: '#00897b',
          secondary: '#0a0a0a',
          accent: '#26a69a',
          background: '#050505',
          surface: '#151515',
          text: '#e0f2f1',
          textSecondary: '#a0bfbd',
          border: '#1e3c3a',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00e0ff'
        }
      },
      {
        name: 'electric-dark',
        displayName: 'Electric Dark',
        description: 'Electric indigo with electric red',
        category: 'dark' as const,
        colors: {
          primary: '#4c00ff',
          secondary: '#0d0d0d',
          accent: '#ff0055',
          background: '#0a0a0a',
          surface: '#1a1a1a',
          text: '#e6e6ff',
          textSecondary: '#b8b8e8',
          border: '#2a2a5a',
          success: '#00ff99',
          warning: '#ffaa00',
          error: '#ff4466',
          info: '#00ddff'
        }
      },
      {
        name: 'old-blood',
        displayName: 'Old Blood',
        description: 'Aged maroon on stone gray',
        category: 'dark' as const,
        colors: {
          primary: '#6b2c2c',
          secondary: '#121212',
          accent: '#a84444',
          background: '#0f0f0f',
          surface: '#1f1f1f',
          text: '#e0e0e0',
          textSecondary: '#b0b0b0',
          border: '#3a2a2a',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff6666',
          info: '#00ccff'
        }
      },
      {
        name: 'royal-darkness',
        displayName: 'Royal Darkness',
        description: 'Pure black with gold accents',
        category: 'dark' as const,
        colors: {
          primary: '#ffd700',
          secondary: '#0a0a0a',
          accent: '#ffed4e',
          background: '#000000',
          surface: '#1a1a1a',
          text: '#f5f5f5',
          textSecondary: '#c0c0c0',
          border: '#2a2a2a',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'burning-coal',
        displayName: 'Burning Coal',
        description: 'Burning red on dying coal black',
        category: 'dark' as const,
        colors: {
          primary: '#cc0000',
          secondary: '#1a1a1a',
          accent: '#ff4444',
          background: '#0d0d0d',
          surface: '#1d1d1d',
          text: '#f0f0f0',
          textSecondary: '#c0c0c0',
          border: '#2a2a2a',
          success: '#00ff66',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00e0ff'
        }
      },
      {
        name: 'danger-amber',
        displayName: 'Danger Amber',
        description: 'Deep navy with amber warnings',
        category: 'dark' as const,
        colors: {
          primary: '#ffa500',
          secondary: '#0d1f3c',
          accent: '#ffcc00',
          background: '#0a1428',
          surface: '#1a2a4a',
          text: '#e8e8e8',
          textSecondary: '#b0b0b0',
          border: '#2a3a5a',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff6666',
          info: '#00ddff'
        }
      },
      {
        name: 'industrial-red',
        displayName: 'Industrial Red',
        description: 'Cold steel gray with warning red',
        category: 'dark' as const,
        colors: {
          primary: '#d32f2f',
          secondary: '#1a1a1a',
          accent: '#ff5252',
          background: '#0f0f0f',
          surface: '#1f1f1f',
          text: '#e8e8e8',
          textSecondary: '#b8b8b8',
          border: '#303030',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#00ddff'
        }
      },
      {
        name: 'toxic-green',
        displayName: 'Toxic Green',
        description: 'Toxic green on pure black',
        category: 'dark' as const,
        colors: {
          primary: '#00ff00',
          secondary: '#0a0a0a',
          accent: '#00ff55',
          background: '#050505',
          surface: '#151515',
          text: '#00ff00',
          textSecondary: '#00cc00',
          border: '#003300',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'slate-crimson',
        displayName: 'Slate Crimson',
        description: 'Slate gray with crimson accents',
        category: 'dark' as const,
        colors: {
          primary: '#c41e3a',
          secondary: '#2c3e50',
          accent: '#e91e63',
          background: '#1a252f',
          surface: '#243447',
          text: '#ecf0f1',
          textSecondary: '#bdc3c7',
          border: '#34495e',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'neon-dark',
        displayName: 'Neon Dark',
        description: 'Jet black with neon red',
        category: 'dark' as const,
        colors: {
          primary: '#ff0000',
          secondary: '#0d0d0d',
          accent: '#ff3333',
          background: '#000000',
          surface: '#1a1a1a',
          text: '#f5f5f5',
          textSecondary: '#c0c0c0',
          border: '#262626',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
          info: '#00e0ff'
        }
      },
      {
        name: 'elegant-plum',
        displayName: 'Elegant Plum',
        description: 'Deep plum on absolute black',
        category: 'dark' as const,
        colors: {
          primary: '#663399',
          secondary: '#0a0a0a',
          accent: '#9966cc',
          background: '#0d0d0d',
          surface: '#1d1d1d',
          text: '#e8d5ff',
          textSecondary: '#c0a8d8',
          border: '#2d1d4d',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'graphite-rose',
        displayName: 'Graphite Rose',
        description: 'Graphite gray with rose red',
        category: 'dark' as const,
        colors: {
          primary: '#d81b60',
          secondary: '#212121',
          accent: '#ff4081',
          background: '#121212',
          surface: '#1e1e1e',
          text: '#f5f5f5',
          textSecondary: '#bdbdbd',
          border: '#303030',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00e0ff'
        }
      },
      {
        name: 'warning-blue',
        displayName: 'Warning Blue',
        description: 'Deep blue with warning orange',
        category: 'dark' as const,
        colors: {
          primary: '#ff8c00',
          secondary: '#0d2b45',
          accent: '#ffaa33',
          background: '#0a1f35',
          surface: '#1a2f45',
          text: '#e8e8e8',
          textSecondary: '#b8b8b8',
          border: '#2a3f55',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff6666',
          info: '#00ddff'
        }
      },
      {
        name: 'cyber-dark',
        displayName: 'Cyber Dark',
        description: 'Pure black with cyber cyan',
        category: 'dark' as const,
        colors: {
          primary: '#00ffff',
          secondary: '#0a0a0a',
          accent: '#00ff88',
          background: '#000000',
          surface: '#1a1a1a',
          text: '#00ffff',
          textSecondary: '#00cc99',
          border: '#003333',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00e0ff'
        }
      },
      {
        name: 'wine-night',
        displayName: 'Wine Night',
        description: 'Deep burgundy on midnight black',
        category: 'dark' as const,
        colors: {
          primary: '#800020',
          secondary: '#0f0f0f',
          accent: '#b8102a',
          background: '#0a0a0a',
          surface: '#1a1a1a',
          text: '#e8e8e8',
          textSecondary: '#b8b8b8',
          border: '#3a1a1a',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff6666',
          info: '#00ccff'
        }
      },
      {
        name: 'mystique-violet',
        displayName: 'Mystique Violet',
        description: 'Charcoal with mystical violet',
        category: 'dark' as const,
        colors: {
          primary: '#8b00ff',
          secondary: '#1a1a1a',
          accent: '#bb33ff',
          background: '#0f0f0f',
          surface: '#1f1f1f',
          text: '#e8d5ff',
          textSecondary: '#c0a8d8',
          border: '#2d1d4d',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'regal-gold',
        displayName: 'Regal Gold',
        description: 'Dark crimson with regal gold',
        category: 'dark' as const,
        colors: {
          primary: '#ffd700',
          secondary: '#1a0a0a',
          accent: '#ffed4e',
          background: '#0d0606',
          surface: '#1d1515',
          text: '#f5f5f5',
          textSecondary: '#c0c0c0',
          border: '#2a1a1a',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff6666',
          info: '#00e0ff'
        }
      },
      {
        name: 'ancient-amber',
        displayName: 'Ancient Amber',
        description: 'Obsidian black with ancient amber',
        category: 'dark' as const,
        colors: {
          primary: '#cc8800',
          secondary: '#0d0d0d',
          accent: '#ffaa33',
          background: '#0a0a0a',
          surface: '#1a1a1a',
          text: '#e8e8e8',
          textSecondary: '#b8b8b8',
          border: '#2a1a0a',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'vampire-night',
        displayName: 'Vampire Night',
        description: 'Midnight blue with vampire scarlet',
        category: 'dark' as const,
        colors: {
          primary: '#cc0000',
          secondary: '#0d1428',
          accent: '#ff3333',
          background: '#0a0f1a',
          surface: '#1a252a',
          text: '#f0f0f0',
          textSecondary: '#c0c0c0',
          border: '#2a1a1a',
          success: '#00ff77',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      },
      {
        name: 'deep-earth',
        displayName: 'Deep Earth',
        description: 'Coal earth with ruby core',
        category: 'dark' as const,
        colors: {
          primary: '#c71f3a',
          secondary: '#0f0f0f',
          accent: '#d81b60',
          background: '#0a0a0a',
          surface: '#1a1a1a',
          text: '#f0f0f0',
          textSecondary: '#b0b0b0',
          border: '#2a1a1a',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff5555',
          info: '#00ddff'
        }
      }
    ];

    // Delete existing dark themes to avoid duplicates
    await Theme.deleteMany({ category: 'dark' as const, isCustom: false });

    // Set first theme as default for reverting
    deadlyThemes[0].isDefault = true;

    // Insert all themes
    const createdThemes = await Theme.insertMany(deadlyThemes);
    console.log(`✅ Created ${createdThemes.length} deadly dark themes with researched color combinations`);

    return createdThemes.length;
  } catch (error: any) {
    console.error('❌ Failed to seed deadly themes:', error.message);
    throw error;
  }
}

export { seedDeadlyThemes };
