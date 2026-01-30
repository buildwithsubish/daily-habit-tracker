import Template from './models/Template';
import connectDB from './mongodb';

export async function seedThemesSimple() {
  await connectDB();

  const templates = [
    {
      name: 'modern-dark',
      displayName: 'Modern Dark',
      description: 'Sleek dark theme with neon accents',
      category: 'dashboard',
      layout: {
        sections: [
          { id: 'header', type: 'header', position: { x: 0, y: 0 }, size: { width: 12, height: 2 }, config: {} },
          { id: 'stats', type: 'stats', position: { x: 0, y: 2 }, size: { width: 12, height: 3 }, config: {} },
          { id: 'habits', type: 'list', position: { x: 0, y: 5 }, size: { width: 12, height: 7 }, config: {} }
        ],
        spacing: '1.5rem',
        containerWidth: '1200px'
      },
      components: {
        colors: {
          primary: '#3b82f6',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc'
        }
      },
      isDefault: true
    },
    {
      name: 'minimal-light',
      displayName: 'Minimal Light',
      description: 'Clean and simple light theme',
      category: 'dashboard',
      layout: {
        sections: [
          { id: 'header', type: 'header', position: { x: 0, y: 0 }, size: { width: 12, height: 2 }, config: {} },
          { id: 'habits', type: 'list', position: { x: 0, y: 2 }, size: { width: 12, height: 10 }, config: {} }
        ],
        spacing: '1rem',
        containerWidth: '1000px'
      },
      components: {
        colors: {
          primary: '#10b981',
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827'
        }
      },
      isDefault: false
    }
  ];

  for (const template of templates) {
    await Template.findOneAndUpdate(
      { name: template.name },
      template,
      { upsert: true, new: true }
    );
  }

  return { count: templates.length };
}
