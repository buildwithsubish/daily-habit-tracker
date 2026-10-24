import Navbar from '@/components/Navbar';
import AchievementNotifier from '@/components/AchievementNotifier';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#090A0F] text-slate-900 dark:text-zinc-100">
      <AchievementNotifier />
      <Navbar />
      <main className="pt-14 sm:pt-16 lg:pt-16">
        <div className="premium-container py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
