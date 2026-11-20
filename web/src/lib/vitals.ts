/**
 * Halchal - Privacy-Friendly Web Vitals Field Telemetry
 * Architecture: ADR-0005 (Zero PII Policy)
 * Captures real-user Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
 * Strictly zero personal data, zero user IDs, zero raw GPS coordinates.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface VitalPayload {
  name: string; // 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB'
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string; // Ephemeral metric run ID
  navigationType: string;
  pathname: string; // Clean URL path
  effectiveType?: string; // '4g' | '3g' | '2g'
  saveData?: boolean;
}

export function reportWebVitals(): void {
  if (typeof window === 'undefined') return;

  const send = (metric: Metric) => {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    };

    const payload: VitalPayload = {
      name: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      delta: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
      id: metric.id,
      navigationType: metric.navigationType,
      pathname: window.location.pathname.split('?')[0],
      effectiveType: nav.connection?.effectiveType,
      saveData: nav.connection?.saveData,
    };

    const body = JSON.stringify(payload);
    const url = '/api/vitals';

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        body,
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {
        // Non-blocking telemetry
      });
    }
  };

  try {
    onCLS(send);
    onFCP(send);
    onINP(send);
    onLCP(send);
    onTTFB(send);
  } catch {
    // Non-fatal if browser environment lacks PerformanceObserver
  }
}
