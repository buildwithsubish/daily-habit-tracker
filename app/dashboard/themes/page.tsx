'use client';

import { useRouter } from 'next/navigation';
import ThemeSelector from '@/components/ThemeSelector';
import { ArrowLeft } from 'lucide-react';

export default function ThemesPage() {
  const router = useRouter();

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-8 max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Themes
        </h1>
        <p className="text-gray-600">
          Choose a theme that matches your style
        </p>
      </div>

      {/* Theme Selector */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <ThemeSelector />
      </div>
    </div>
  );
}
