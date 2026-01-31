'use client';

import { useState, useEffect, useCallback } from 'react';

export type MonkeyState = 'roaming' | 'greeting' | 'branch_grab' | 'swinging' | 'password_peek' | 'logo_peek' | 'curious' | 'surprised' | 'mischievous' | 'happy';

interface Position {
  x: number;
  y: number;
}

export function useMonkeyMovement() {
  const [state, setState] = useState<MonkeyState>('roaming');
  const [position, setPosition] = useState<Position>({ x: 85, y: 15 }); // Start top-right
  const [rotation, setRotation] = useState(0);

  const roam = useCallback(() => {
    // New Path: Top-right → swings on vine → bottom-left → climbs branch → repeat
    const sequence = async () => {
      // 1. Idle at top-right
      setState('roaming');
      setPosition({ x: 85, y: 15 });
      await new Promise(r => setTimeout(r, 2000));

      // 2. Swings on vine (move to center/left)
      setState('swinging');
      setPosition({ x: 40, y: 30 });
      await new Promise(r => setTimeout(r, 1500));

      // 3. Land at bottom-left
      setState('roaming');
      setPosition({ x: 15, y: 85 });
      await new Promise(r => setTimeout(r, 2000));

      // 4. Climb branch
      setState('branch_grab');
      setPosition({ x: 15, y: 40 });
      await new Promise(r => setTimeout(r, 2000));

      // 5. Back to start (top-right)
      setState('roaming');
      setPosition({ x: 85, y: 15 });
      await new Promise(r => setTimeout(r, 2000));
    };

    sequence();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (state === 'roaming' || state === 'swinging') {
        // Simple oscillation or roaming logic can be expanded here
      }
    }, 100);
    return () => clearInterval(interval);
  }, [state]);

  // Start roaming cycle
  useEffect(() => {
    roam();
    const interval = setInterval(roam, 10000);
    return () => clearInterval(interval);
  }, [roam]);

  return { state, setState, position, setPosition, rotation, setRotation };
}
