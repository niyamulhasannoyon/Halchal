import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent } from './analytics';

describe('Halchal Privacy-Friendly Analytics Engine', () => {
  let listeners: Record<string, Array<(event: any) => void>> = {};

  beforeEach(() => {
    listeners = {};
    const mockWindow = {
      addEventListener: (type: string, listener: (event: any) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      },
      removeEventListener: (type: string, listener: (event: any) => void) => {
        listeners[type] = (listeners[type] || []).filter((l) => l !== listener);
      },
      dispatchEvent: (event: any) => {
        const type = event.type;
        (listeners[type] || []).forEach((fn) => fn(event));
        return true;
      },
      umami: undefined as any,
      plausible: undefined as any,
    };

    (globalThis as any).window = mockWindow;

    class MockCustomEvent {
      type: string;
      detail: any;
      constructor(type: string, init?: { detail?: any }) {
        this.type = type;
        this.detail = init?.detail;
      }
    }
    (globalThis as any).CustomEvent = MockCustomEvent;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).CustomEvent;
  });

  it('safely handles window dispatch when no third-party tracker is loaded', () => {
    const listener = vi.fn();
    window.addEventListener('halchal:analytics', listener);

    trackEvent('report_started', { category: 'electricity' });

    expect(listener).toHaveBeenCalled();
    const eventDetail = listener.mock.calls[0][0].detail;
    expect(eventDetail.event).toBe('report_started');
    expect(eventDetail.data.category).toBe('electricity');

    window.removeEventListener('halchal:analytics', listener);
  });

  it('routes events to Umami when window.umami is present', () => {
    const umamiTrack = vi.fn();
    (window as any).umami = { track: umamiTrack };

    trackEvent('report_completed', { category: 'gas', state: 'out' });

    expect(umamiTrack).toHaveBeenCalledWith('report_completed', {
      category: 'gas',
      state: 'out',
    });
  });

  it('routes events to Plausible when window.plausible is present', () => {
    const plausibleTrack = vi.fn();
    (window as any).plausible = plausibleTrack;

    trackEvent('share_clicked', { channel: 'whatsapp' });

    expect(plausibleTrack).toHaveBeenCalledWith('share_clicked', {
      props: { channel: 'whatsapp' },
    });
  });

  it('strips sensitive coordinates or unauthorized fields from event payloads', () => {
    const listener = vi.fn();
    window.addEventListener('halchal:analytics', listener);

    trackEvent('report_started', {
      category: 'electricity',
      lat: 23.75,
      lng: 90.38,
      userId: 'secret-id',
    });

    const eventDetail = listener.mock.calls[0][0].detail;
    expect(eventDetail.data.lat).toBeUndefined();
    expect(eventDetail.data.lng).toBeUndefined();
    expect(eventDetail.data.userId).toBeUndefined();
    expect(eventDetail.data.category).toBe('electricity');

    window.removeEventListener('halchal:analytics', listener);
  });

  it('safely handles SSR when window is undefined', () => {
    delete (globalThis as any).window;
    expect(() => trackEvent('report_started', { category: 'water' })).not.toThrow();
  });
});
