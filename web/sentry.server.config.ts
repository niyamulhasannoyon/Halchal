/**
 * Halchal (হালচাল) - Sentry Server Configuration
 * Architecture: ADR-0005 (Privacy), Zero PII Policy
 */

import { scrubSentryEvent } from './sentry.client.config';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export function initServerSentry() {
  if (!SENTRY_DSN) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs');
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      sendDefaultPii: false,
      tracesSampleRate: 0.2, // 20% sample on serverless routes
      beforeSend(event: Record<string, unknown>) {
        return scrubSentryEvent(event);
      },
    });
  } catch {
    // Graceful fallback when SDK is not yet linked
  }
}

initServerSentry();
