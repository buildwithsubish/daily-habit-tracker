'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Achievement } from '@/types';
import { useCelebration } from '@/components/CelebrationProvider';
import { toast } from 'react-hot-toast';
import AchievementToast from '@/components/AchievementToast';


export function useAchievementAudit() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isFirstMount = useRef(true);
  const celebratedLocalRef = useRef<Set<string>>(new Set());

  const { celebrateAchievement } = useCelebration();

  const fetchAchievements = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/achievements');
      const data = await res.json();
      const newAchievements: Achievement[] = data.achievements || [];
      
      const newUnlockedIds = new Set(newAchievements.filter(a => a.achieved).map(a => a.id));

      if (!isFirstMount.current) {
        let newlyCelebrated = false;
        // Find achievements that are achieved but NOT YET CELEBRATED (according to server and local session)
        const achievementsToCelebrate = newAchievements.filter(a => 
          a.achieved && !a.celebrated && !celebratedLocalRef.current.has(a.id)
        );

        for (const a of achievementsToCelebrate) {
          // NEW UNLOCK DETECTED & NOT YET CELEBRATED!
          celebrateAchievement(a.points, a.tier);
          celebratedLocalRef.current.add(a.id);
          newlyCelebrated = true;
          
          // Persist celebration to server
          fetch('/api/achievements/celebrate', {
            method: 'POST',
            body: JSON.stringify({ achievementId: a.id }),
            headers: { 'Content-Type': 'application/json' }
          }).catch(err => console.error('Failed to persist celebration:', err));

          toast.custom((t) => (
            <AchievementToast achievement={a} t={t} />
          ), {
            duration: 5000,
            position: 'bottom-center'
          });

          // Wait before showing the next notification to ensure they show one by one
          if (achievementsToCelebrate.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      setAchievements(newAchievements);
      setUnlockedIds(newUnlockedIds);
      isFirstMount.current = false;

    } catch (err) {
      console.error('Audit error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [unlockedIds, celebrateAchievement]);

  useEffect(() => {
    fetchAchievements();

    // Listen for habit completions
    const handleRefetch = () => fetchAchievements(true);
    window.addEventListener('habit-refetch', handleRefetch);
    
    return () => window.removeEventListener('habit-refetch', handleRefetch);
  }, [fetchAchievements]);

  return { achievements, loading, refresh: fetchAchievements };
}
