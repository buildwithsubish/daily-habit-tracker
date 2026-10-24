'use client';

/**
 * Enhanced cross-platform notification and reminder utility
 * Supports iOS Safari (including standalone PWA), desktop browsers,
 * device default alert sounds, and in-app alerts.
 */

// Detect if running on iOS (iPhone, iPad, iPod)
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isMacTouch = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isAppleDevice || isMacTouch;
}

// Detect if installed as a Standalone PWA on home screen
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone = (window.navigator as any).standalone === true;
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return isStandalone || displayModeStandalone;
}

// Cross-browser notification permission request (handles Safari callbacks and modern Promises)
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    // Safari compatibility: older versions expect a callback, modern ones return a Promise
    let permission: NotificationPermission;
    if (Notification.requestPermission.length === 0) {
      permission = await Notification.requestPermission();
    } else {
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((status) => resolve(status));
      });
    }
    return permission || Notification.permission;
  } catch (err) {
    console.warn('[Notification] Permission request error:', err);
    return 'denied';
  }
}

interface TriggerReminderOptions {
  title: string;
  body: string;
  tag?: string;
  playSound?: boolean;
  onClick?: () => void;
}

/**
 * Safely trigger a system notification across browsers and iOS.
 * Uses device default alert sound and standard Notification / ServiceWorker APIs.
 */
export async function triggerNotification(options: TriggerReminderOptions): Promise<boolean> {
  const { title, body, tag = 'habit-reminder', playSound = true, onClick } = options;

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // 1. Try ServiceWorkerRegistration.showNotification (works in PWA and iOS 16.4+)
  // silent: !playSound lets the device play its native default notification sound
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          tag,
          icon: '/icon.svg',
          badge: '/icon.svg',
          silent: !playSound,
        });
        return true;
      }
    } catch (e) {
      console.debug('[Notification] Service worker notification skipped:', e);
    }
  }

  // 2. Try window Notification constructor (wrapped in try-catch for iOS Safari where constructor throws)
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/icon.svg',
      silent: !playSound,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
    return true;
  } catch (e) {
    console.debug('[Notification] Direct Notification constructor failed (iOS WebKit expected):', e);
    return false;
  }
}
