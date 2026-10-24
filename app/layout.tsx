import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppProvider } from '@/context/AppContext';
import { Providers } from '@/components/Providers';
import { CelebrationProvider } from '@/components/CelebrationProvider';
import './globals.css';

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
  themeColor: '#0a0a0a',
};

import { HiddenModeProvider } from '@/context/HiddenModeContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('themeMode');if(!m){var c=document.cookie.match(/(^|;)\\s*themeMode\\s*=\\s*([^;]+)/);if(c)m=c[2];}var d=m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches)||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <Providers>
          <HiddenModeProvider>
            <ThemeProvider>
              <AppProvider>
                <CelebrationProvider>
                  {children}
                </CelebrationProvider>
              </AppProvider>
            </ThemeProvider>
          </HiddenModeProvider>
        </Providers>
      </body>
    </html>
  );
}
