import Navbar from '@/components/Navbar';
import AchievementNotifier from '@/components/AchievementNotifier';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#030712] transition-colors duration-500">
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
