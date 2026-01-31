'use client';

import { useState, useEffect } from 'react';
import MonkeyAvatar from './MonkeyAvatar';

interface GlobalMonkeyProps {
  followCursor?: boolean;
}

export default function GlobalMonkey({ followCursor = false }: GlobalMonkeyProps) {
  const [username, setUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-[999] pointer-events-none scale-75 origin-bottom-right">
      <MonkeyAvatar />
    </div>
  );
}
