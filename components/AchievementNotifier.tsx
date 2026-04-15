'use client';

import { useAchievementAudit } from '@/hooks/useAchievementAudit';

export default function AchievementNotifier() {
  // This component doesn't render anything, it just uses the hook
  // to audit achievements in the background.
  useAchievementAudit();
  
  return null;
}
