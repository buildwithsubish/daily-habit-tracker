import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { WhatsAppProvider } from '@/contexts/WhatsAppStatusContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppProvider } from '@/context/AppContext';
import { Providers } from '@/components/Providers';
import { CelebrationProvider } from '@/components/CelebrationProvider';
import AchievementNotifier from '@/components/AchievementNotifier';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DailyHabit Flow | Premium Habit Tracking Platform',
  description: 'Transform your daily routine with intelligent habit tracking, streak insights, and motivational milestones. Build lasting habits with DailyHabit Flow.',
  keywords: ['habit tracker', 'productivity', 'streaks', 'daily habits', 'goal tracking'],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#6366f1',
};

import { HiddenModeProvider } from '@/context/HiddenModeContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 transition-colors duration-300">
        <Providers>
          <HiddenModeProvider>
            <ThemeProvider>
              <AppProvider>
                <WhatsAppProvider>
                  <CelebrationProvider>
                    <AchievementNotifier />
                    {children}
                  </CelebrationProvider>
                </WhatsAppProvider>
              </AppProvider>
            </ThemeProvider>
          </HiddenModeProvider>
        </Providers>
      </body>
    </html>
  );
}
