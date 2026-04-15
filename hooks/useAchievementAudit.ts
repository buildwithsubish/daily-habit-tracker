'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Achievement } from '@/types';
import { useCelebration } from '@/components/CelebrationProvider';
import { toast } from 'react-hot-toast';

export function useAchievementAudit() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const isFirstMount = useRef(true);
  const celebratedIdsRef = useRef<Set<string>>(new Set());
  const { celebrateAchievement } = useCelebration();

  // Initialize celebratedIds from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('celebrated_achievements');
    if (saved) {
      try {
        celebratedIdsRef.current = new Set(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse celebrated ids', e);
      }
    }
  }, []);

  const fetchAchievements = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/achievements');
      const data = await res.json();
      const newAchievements: Achievement[] = data.achievements || [];
      
      const newUnlocked = newAchievements.filter(a => a.achieved);
      const newUnlockedIds = new Set(newUnlocked.map(a => a.id));

      if (!isFirstMount.current) {
        let newlyCelebrated = false;
        newUnlocked.forEach(a => {
          if (!unlockedIds.has(a.id) && !celebratedIdsRef.current.has(a.id)) {
            // NEW UNLOCK DETECTED!
            celebrateAchievement(a.points, a.tier);
            celebratedIdsRef.current.add(a.id);
            newlyCelebrated = true;
            
            toast.success(`Achievement Unlocked: ${a.title}! (+${a.points} pts)`, {
              duration: 5000,
              icon: a.icon,
              style: {
                borderRadius: '16px',
                background: '#18181b',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            });
          }
        });
        
        if (newlyCelebrated) {
          localStorage.setItem('celebrated_achievements', JSON.stringify(Array.from(celebratedIdsRef.current)));
        }
      } else {
        // On first mount, just populate the celebratedIdsRef if they are already achieved
        newUnlocked.forEach(a => celebratedIdsRef.current.add(a.id));
        localStorage.setItem('celebrated_achievements', JSON.stringify(Array.from(celebratedIdsRef.current)));
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
