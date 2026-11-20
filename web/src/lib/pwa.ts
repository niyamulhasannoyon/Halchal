/**
 * Halchal - PWA Client Service Worker & Install Prompt Manager
 * Rule: Install prompt is shown ONLY after the first successful report.
 */

import { trackEvent } from '@/lib/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const HAS_REPORTED_KEY = 'halchal_has_successfully_reported';
const PROMPT_DISMISSED_KEY = 'halchal_install_prompt_dismissed';

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const register = () => {
    const doRegister = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update available
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('ServiceWorker registration error:', err);
        });
    };

    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(doRegister);
    } else {
      setTimeout(doRegister, 1000);
    }
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }

  // Capture beforeinstallprompt event without showing automatic banner
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
  });
}

/**
 * Checks whether user has ever submitted a report
 */
export function hasUserSuccessfullyReported(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(HAS_REPORTED_KEY) === 'true';
}

/**
 * Marks that a report has been successfully submitted
 */
export function markSuccessfulReportSubmitted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HAS_REPORTED_KEY, 'true');

  // Trigger custom event so UI can display install prompt if eligible
  window.dispatchEvent(new CustomEvent('halchal:eligible_for_pwa_install'));
}

/**
 * Checks whether the install prompt is eligible to be shown:
 * 1. Has submitted at least one report
 * 2. Has captured the beforeinstallprompt event
 * 3. Has not dismissed the prompt previously
 */
export function canShowInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  const hasReported = hasUserSuccessfullyReported();
  const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
  return hasReported && !dismissed && deferredInstallPrompt !== null;
}

/**
 * Triggers the browser install prompt
 */
export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    return 'unavailable';
  }

  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    trackEvent('install_prompt_shown', { outcome: choice.outcome });
    if (choice.outcome === 'accepted') {
      localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    }
    return choice.outcome;
  } catch (err) {
    console.warn('Install prompt error:', err);
    return 'unavailable';
  }
}

/**
 * Dismisses the install prompt for this device
 */
export function dismissInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
}
