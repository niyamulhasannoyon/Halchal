/**
 * Halchal - Web Push Client Utilities
 * Handles VAPID key conversion, subscription management, and backend sync.
 */

import { getOrCreateDeviceId } from './device';
import { getStoredHomeZone } from './zones';

const PUSH_SUBSCRIBED_KEY = 'halchal_push_subscribed';
const PUSH_SETTINGS_KEY = 'halchal_push_settings';

export interface PushSettings {
  categories: string[];
  allowNightAlerts: boolean;
  h3Subscriptions: string[];
}

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  categories: ['electricity', 'gas', 'water', 'lpg'],
  allowNightAlerts: false,
  h3Subscriptions: [],
};

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export function isUserPushSubscribed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true';
}

export function getLocalPushSettings(): PushSettings {
  if (typeof window === 'undefined') return DEFAULT_PUSH_SETTINGS;
  try {
    const raw = localStorage.getItem(PUSH_SETTINGS_KEY);
    if (!raw) return DEFAULT_PUSH_SETTINGS;
    return { ...DEFAULT_PUSH_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PUSH_SETTINGS;
  }
}

export function saveLocalPushSettings(settings: PushSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PUSH_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Converts VAPID URL-safe base64 public key to Uint8Array for PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Requests push notification permission and registers subscription with backend
 */
export async function subscribeToPush(
  settings: Partial<PushSettings> = {}
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'এই ব্রাউজারে পুশ নোটিফিকেশন সমর্থিত নয়।' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'নোটিফিকেশন অনুমতি বাতিল করা হয়েছে।' };
    }

    const reg = await navigator.serviceWorker.ready;

    // Use environment VAPID public key or standard dev fallback
    const vapidKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

    const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource,
      });
    }

    const homeZone = getStoredHomeZone();
    const finalH3Subs = settings.h3Subscriptions || (homeZone ? [homeZone] : []);
    const finalCategories = settings.categories || ['electricity', 'gas', 'water', 'lpg'];
    const allowNight = Boolean(settings.allowNightAlerts);

    const deviceId = getOrCreateDeviceId();

    // Sync to backend
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        h3_subscriptions: finalH3Subs,
        categories: finalCategories,
        allow_night_alerts: allowNight,
        device_id: deviceId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'সার্ভারে সংরক্ষণ ব্যর্থ হয়েছে।' };
    }

    localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
    saveLocalPushSettings({
      categories: finalCategories,
      allowNightAlerts: allowNight,
      h3Subscriptions: finalH3Subs,
    });

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'পুশ নোটিফিকেশন চালু করা সম্ভব হয়নি। ব্রাউজারের নোটিফিকেশন পারমিশন ও নেটওয়ার্ক সংযোগ পরীক্ষা করুন।',
    };
  }
}

/**
 * Unsubscribes from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return true;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
    return true;
  } catch {
    return false;
  }
}
