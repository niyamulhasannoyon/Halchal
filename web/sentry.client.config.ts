/**
 * Halchal (হালচাল) - Sentry Client Configuration
 * Architecture: ADR-0005 (Privacy), Zero PII Policy
 *
 * Sentry is configured to capture uncaught client exceptions, hydration errors,
 * and fetch failures while strictly stripping all PII (IPs, coordinates, user emails).
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function scrubSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  // 1. Remove IP addresses and user identifiers
  if (event.user && typeof event.user === 'object') {
    const user = event.user as Record<string, unknown>;
    delete user.ip_address;
    delete user.email;
    delete user.username;
  }

  // 2. Scrub request data if present
  if (event.request && typeof event.request === 'object') {
    const req = event.request as Record<string, unknown>;
    delete req.cookies;
    if (req.headers && typeof req.headers === 'object') {
      const headers = req.headers as Record<string, unknown>;
      delete headers.authorization;
      delete headers.cookie;
      delete headers['x-forwarded-for'];
      delete headers['cf-connecting-ip'];
    }
  }

  // 3. Scrub breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      if (crumb && typeof crumb === 'object' && crumb.data) {
        const data = { ...(crumb.data as Record<string, unknown>) };
        // Delete coordinate leaks
        delete data.lat;
        delete data.lng;
        delete data.latitude;
        delete data.longitude;
        delete data.coords;
        return { ...crumb, data };
      }
      return crumb;
    });
  }

  // 4. Scrub extra context
  if (event.extra && typeof event.extra === 'object') {
    const extra = event.extra as Record<string, unknown>;
    delete extra.lat;
    delete extra.lng;
    delete extra.latitude;
    delete extra.longitude;
    delete extra.coords;
    delete extra.phone;
    delete extra.email;
  }

  return event;
}

export function initClientSentry() {
  if (!SENTRY_DSN) {
    return;
  }

  try {
    // Dynamically require or import if available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs');
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      sendDefaultPii: false,
      tracesSampleRate: 0.1, // Sample 10% of transactions to preserve quotas
      beforeSend(event: Record<string, unknown>) {
        return scrubSentryEvent(event);
      },
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Network request failed',
        'Load failed',
      ],
    });
  } catch {
    // Sentry SDK optional or loaded conditionally
  }
}

initClientSentry();
