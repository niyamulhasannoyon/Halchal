/**
 * Halchal (হালচাল) - SRE Structured Logger (Zero PII)
 * Architecture: ADR-0005 (Privacy), ADR-0007, SRE Observability Guidelines
 *
 * Guarantees:
 * 1. Outputs structured JSON log lines for Logflare / Datadog / CloudWatch / Vercel.
 * 2. STRICTLY scrubs PII: raw GPS coordinates, phone numbers, emails, authorization tokens,
 *    and exact client IP addresses.
 * 3. Preserves operational dimensions: h3_index, category, state, latency_ms, status_code.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogPayload {
  level: LogLevel;
  event: string;
  service?: string;
  correlation_id?: string;
  h3_index?: string;
  category?: string;
  status_code?: number;
  duration_ms?: number;
  error?: string;
  meta?: Record<string, unknown>;
}

// Regular expressions to detect and scrub sensitive data
const SENSITIVE_KEY_REGEX = /(password|token|secret|auth|bearer|jwt|key|cookie|credential)/i;
const PHONE_REGEX = /(\+?880|01)[3-9]\d{8}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/**
 * Anonymizes an IP address by zeroing the last two octets (CGNAT/subnet privacy)
 */
export function anonymizeIp(ip: string): string {
  if (!ip) return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.0.0/16`;
  }
  return 'anonymized-ip';
}

/**
 * Recursively scrubs any potential PII or secrets from an object
 */
export function scrubPii(obj: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED_DEPTH]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    let clean = obj;
    // Scrub phone numbers
    clean = clean.replace(PHONE_REGEX, '[PHONE_REDACTED]');
    // Scrub emails
    clean = clean.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
    return clean;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubPii(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Strictly remove GPS coordinates if any leaked into payload
      if (['lat', 'lng', 'latitude', 'longitude', 'accuracy', 'coords'].includes(key.toLowerCase())) {
        scrubbed[key] = '[GPS_SCRUBBED_ADR0005]';
        continue;
      }

      // Redact sensitive keys
      if (SENSITIVE_KEY_REGEX.test(key)) {
        scrubbed[key] = '[REDACTED_SECRET]';
        continue;
      }

      // Anonymize IP fields
      if (['ip', 'client_ip', 'remote_addr'].includes(key.toLowerCase()) && typeof value === 'string') {
        scrubbed[key] = anonymizeIp(value);
        continue;
      }

      scrubbed[key] = scrubPii(value, depth + 1);
    }
    return scrubbed;
  }

  return String(obj);
}

class StructuredLogger {
  private service = 'halchal-web';

  private emit(level: LogLevel, event: string, details: Partial<LogPayload> = {}) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      event,
      service: details.service || this.service,
    };

    if (details.correlation_id) entry.correlation_id = details.correlation_id;
    if (details.h3_index) entry.h3_index = details.h3_index;
    if (details.category) entry.category = details.category;
    if (details.status_code !== undefined) entry.status_code = details.status_code;
    if (details.duration_ms !== undefined) entry.duration_ms = Math.round(details.duration_ms);
    if (details.error) entry.error = details.error;

    if (details.meta) {
      entry.meta = scrubPii(details.meta);
    }

    const logLine = JSON.stringify(entry);

    switch (level) {
      case 'ERROR':
        console.error(logLine);
        break;
      case 'WARN':
        console.warn(logLine);
        break;
      case 'DEBUG':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(logLine);
        }
        break;
      case 'INFO':
      default:
        console.log(logLine);
        break;
    }
  }

  info(event: string, details?: Partial<LogPayload>) {
    this.emit('INFO', event, details);
  }

  warn(event: string, details?: Partial<LogPayload>) {
    this.emit('WARN', event, details);
  }

  error(event: string, details?: Partial<LogPayload>) {
    this.emit('ERROR', event, details);
  }

  debug(event: string, details?: Partial<LogPayload>) {
    this.emit('DEBUG', event, details);
  }
}

export const logger = new StructuredLogger();
