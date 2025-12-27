import ThemeDemo from '@/components/ThemeDemo';

export default function ThemesPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
      <div className="container mx-auto py-8">
        <ThemeDemo />
      </div>
    </div>
  );
}
