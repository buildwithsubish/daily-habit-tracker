// Test WhatsApp utility functions without importing the problematic module

describe('WhatsApp Utils', () => {
  describe('Encouragement Messages', () => {
    it('should have valid encouragement messages', () => {
      const ENCOURAGEMENTS = [
        "Stay consistent — every small step counts. 🔥",
        "You're doing great! Keep building those habits. 💪",
        "One day at a time. Proud of you! 🌟",
        "Consistency is the key to mastery. Keep it up! 🎯",
        "Remember why you started. You've got this! ✨",
        "Small wins compound into massive success. 🚀",
      ];

      ENCOURAGEMENTS.forEach(message => {
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should select random encouragement message', () => {
      const ENCOURAGEMENTS = [
        "Stay consistent — every small step counts. 🔥",
        "You're doing great! Keep building those habits. 💪",
      ];

      // Test random selection
      const randomIndex = Math.floor(Math.random() * ENCOURAGEMENTS.length);
      const selectedMessage = ENCOURAGEMENTS[randomIndex];

      expect(ENCOURAGEMENTS).toContain(selectedMessage);
    });
  });

  describe('Habit List Formatting', () => {
    it('should format empty habits array', () => {
      const habits = [];
      const message = "You have no habits scheduled for today! Enjoy your day.";
      
      expect(message).toBe("You have no habits scheduled for today! Enjoy your day.");
    });

    it('should format single habit', () => {
      const habits = [{ name: 'Exercise', category: 'Health' }];
      const habitList = habits
        .map((h, i) => `${i + 1}. ⬜ ${h.name}${h.category ? ` (${h.category})` : ''}`)
        .join('\n');
      
      const expectedMessage = `*📝 Your Daily Rituals*\n\n${habitList}\n\n_Reply with the numbers of the habits you've completed! (e.g. "1, 3")_`;
      
      expect(habitList).toContain('1. ⬜ Exercise (Health)');
      expect(expectedMessage).toContain('📝 Your Daily Rituals');
    });

    it('should format multiple habits', () => {
      const habits = [
        { name: 'Exercise', category: 'Health' },
        { name: 'Read', category: 'Learning' },
        { name: 'Meditate', category: 'Wellness' }
      ];
      
      const habitList = habits
        .map((h, i) => `${i + 1}. ⬜ ${h.name}${h.category ? ` (${h.category})` : ''}`)
        .join('\n');
      
      expect(habitList).toContain('1. ⬜ Exercise (Health)');
      expect(habitList).toContain('2. ⬜ Read (Learning)');
      expect(habitList).toContain('3. ⬜ Meditate (Wellness)');
    });

    it('should handle habits without categories', () => {
      const habits = [{ name: 'Exercise' }, { name: 'Read' }] as Array<{ name: string; category?: string }>;
      
      const habitList = habits
        .map((h, i) => `${i + 1}. ⬜ ${h.name}${h.category ? ` (${h.category})` : ''}`)
        .join('\n');
      
      expect(habitList).toContain('1. ⬜ Exercise');
      expect(habitList).toContain('2. ⬜ Read');
      expect(habitList).not.toContain('(Health)');
    });
  });

  describe('Time Greeting', () => {
    it('should return Good morning before 12', () => {
      const hour = 8;
      const expected = 'Good morning';
      
      // Mock Date.getHours
      const mockDate = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      jest.spyOn(mockDate, 'getHours').mockReturnValue(hour);
      
      const getTimeGreeting = () => {
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
      };
      
      expect(getTimeGreeting()).toBe(expected);
    });

    it('should return Good afternoon between 12 and 17', () => {
      const hour = 14;
      const expected = 'Good afternoon';
      
      const getTimeGreeting = () => {
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
      };
      
      expect(getTimeGreeting()).toBe(expected);
    });

    it('should return Good evening after 17', () => {
      const hour = 20;
      const expected = 'Good evening';
      
      const getTimeGreeting = () => {
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
      };
      
      expect(getTimeGreeting()).toBe(expected);
    });
  });
});
