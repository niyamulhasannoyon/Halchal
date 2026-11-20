/**
 * Halchal - Privacy-Centric Analytics Engine
 * Architecture: Technical SEO Foundation & CLAUDE.md Privacy Directives
 *
 * Privacy Guarantees:
 * 1. Zero Raw GPS / Coordinate Transmission: Never transmits lat/lng or street addresses.
 * 2. Absolute Citizen Anonymity: No user IDs, device fingerprints, or IP logging.
 * 3. No Commercial Tracking: No dealer names, shop IDs, or ad network pixels.
 * 4. Lightweight Footprint: < 2 KB script overhead, zero cookies, GDPR and Bangladesh privacy compliant.
 *
 * Supported Integrations:
 * - Cloudflare Web Analytics
 * - Umami (self-hosted / cloud)
 * - Plausible Analytics
 */

export type AnalyticsEvent =
  | 'report_started'
  | 'report_completed'
  | 'share_clicked'
  | 'install_prompt_shown';

export interface EventData {
  category?: string;
  state?: string;
  channel?: 'whatsapp' | 'facebook' | 'native_share' | 'clipboard';
  outcome?: 'accepted' | 'dismissed' | 'unavailable';
  [key: string]: unknown;
}

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * Dispatches a privacy-safe custom analytics event
 */
export function trackEvent(event: AnalyticsEvent, data?: EventData): void {
  if (typeof window === 'undefined') return;

  // Sanitized payload stripped of any private coordinates or IDs
  const cleanData: Record<string, unknown> = {};
  if (data) {
    if (data.category) cleanData.category = String(data.category);
    if (data.state) cleanData.state = String(data.state);
    if (data.channel) cleanData.channel = String(data.channel);
    if (data.outcome) cleanData.outcome = String(data.outcome);
  }

  try {
    // 1. Umami Analytics Integration
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(event, cleanData);
      return;
    }

    // 2. Plausible Analytics Integration
    if (typeof window.plausible === 'function') {
      window.plausible(event, { props: cleanData });
      return;
    }

    // 3. Fallback: custom DOM event for internal monitoring & testing
    window.dispatchEvent(
      new CustomEvent('halchal:analytics', {
        detail: { event, data: cleanData, timestamp: Date.now() },
      })
    );
  } catch {
    // Fail silently to never interrupt citizen UI or reporting flow
  }
}
