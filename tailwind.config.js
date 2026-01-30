/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Color classes used dynamically in AnalyticsClient.tsx
    'text-orange-500',
    'text-blue-500',
    'text-purple-500',
    'text-green-500',
    'bg-orange-50',
    'bg-blue-50',
    'bg-purple-50',
    'bg-green-50',
    'from-orange-500/10',
    'from-blue-500/10',
    'from-purple-500/10',
    'from-green-500/10',
    // Gradient classes used dynamically in Insights cards
    'from-yellow-500',
    'from-orange-500',
    'from-blue-500',
    'from-cyan-500',
    'from-green-500',
    'from-emerald-500',
    'from-purple-500',
    'from-pink-500',
    // Color classes used dynamically in habits/page.tsx
    'text-amber-500',
    'text-emerald-500',
    // Color classes used dynamically in presets-templates/page.tsx
    'bg-green-500',
    'bg-orange-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-slate-500',
    'text-green-600',
    'text-orange-600',
    'text-blue-600',
    'text-purple-600',
    'text-yellow-600',
    'text-slate-600',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}

