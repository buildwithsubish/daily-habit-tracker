'use client';

import { useEffect, useState } from 'react';
import { Trophy, Flame, Star, Target, Zap, Award } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export default function AchievementBadges() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    // Fetch achievements from API
    fetch('/api/achievements')
      .then(res => res.json())
      .then(data => {
        setAchievements(data.achievements || []);
      })
      .catch(() => {
        // Default achievements if API fails
        setAchievements([
          {
            id: 'first-habit',
            name: 'Getting Started',
            description: 'Create your first habit',
            icon: <Star className="text-yellow-500" size={24} />,
            unlocked: false,
            progress: 0,
            maxProgress: 1,
          },
          {
            id: 'week-streak',
            name: 'Week Warrior',
            description: 'Complete habits for 7 days straight',
            icon: <Flame className="text-orange-500" size={24} />,
            unlocked: false,
            progress: 0,
            maxProgress: 7,
          },
          {
            id: 'month-streak',
            name: 'Monthly Master',
            description: 'Complete habits for 30 days straight',
            icon: <Trophy className="text-purple-500" size={24} />,
            unlocked: false,
            progress: 0,
            maxProgress: 30,
          },
        ]);
      });
  }, []);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-3.5 sm:p-4 md:p-6 animate-scale-in">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Award className="text-primary-500 flex-shrink-0" size={18} />
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Achievements</h3>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`
              p-2.5 sm:p-3 rounded-lg border-2 transition-all duration-300
              ${achievement.unlocked
                ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-md'
                : 'border-gray-200 bg-white'
              }
              hover:scale-[1.02] sm:hover:scale-105
            `}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`flex-shrink-0 ${achievement.unlocked ? 'animate-pulse' : ''}`}>
                {achievement.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-xs sm:text-sm ${achievement.unlocked ? 'text-gray-900' : 'text-gray-700'}`}>
                  {achievement.name}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5 sm:mt-1 leading-relaxed">{achievement.description}</p>
                {!achievement.unlocked && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">
                      {achievement.progress}/{achievement.maxProgress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

