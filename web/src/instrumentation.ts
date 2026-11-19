/**
 * Halchal (হালচাল) - Next.js 15 App Router Instrumentation
 * Runs once upon server boot. Initializes serverless observability and Sentry hooks.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.server.config');
  }
}
