import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Daily Habit Tracker | Elite Performance',
  description: 'The ultimate habit tracking platform for high performers.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-blue-500/30">
        {children}
      </body>
    </html>
  );
}
