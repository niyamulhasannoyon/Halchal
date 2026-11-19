/**
 * Halchal (হালচাল) - Core Type Definitions for Supabase Edge Functions
 * Architecture: ADR-0001 (H3 Res 8), ADR-0002 (submit-report gateway),
 * ADR-0003 (Enums), ADR-0005 (Privacy), ADR-0007 (Security Definer & Anti-Gaming)
 */

export type UtilityCategory = 'electricity' | 'gas' | 'water' | 'lpg';

export type ReportState = 'ok' | 'low' | 'out';

export type ZoneState = 'ok' | 'low' | 'out' | 'unverified' | 'unknown';

export type TrustTier = 'anonymous' | 'google' | 'phone';

/**
 * Attestation token input supporting Web (Cloudflare Turnstile) and Android (Play Integrity)
 */
export type AttestationPayload =
  | { provider: 'turnstile'; token: string }
  | { provider: 'play_integrity'; token: string; packageName?: string }
  | { provider: 'mock'; token: string; valid?: boolean };

/**
 * Incoming HTTP Request Contract for `submit-report`
 */
export interface SubmitReportRequest {
  category: UtilityCategory;
  state: ReportState;
  price_bdt?: number;
  lat: number;
  lng: number;
  accuracy_m: number;
  client_ts: string;
  device_id: string; // Random UUID generated client-side and persisted locally
  attestation: AttestationPayload | string;
  update_home?: boolean; // Optional flag to change home cell if >= 7 days passed
}

/**
 * Sanitized Internal Report Payload (Raw GPS coordinates strictly discarded)
 */
export interface SanitizedReportPayload {
  h3_index: string;
  category: UtilityCategory;
  state: ReportState;
  price_bdt: number | null;
  client_ts: string;
  device_id: string;
  update_home?: boolean;
}

/**
 * Materialized Zone Category Status returned from database RPC
 */
export interface ZoneCategoryStatus {
  h3_index: string;
  category: UtilityCategory;
  state: ZoneState;
  distinct_reporters: number;
  weighted_score: number;
  state_since: string;
  updated_at: string;
}

/**
 * 4-Category Full Zone Status record with Bengali localized area metadata
 */
export interface ZoneStatusRecord {
  h3_index: string;
  area_name_bn: string;
  ward: string | null;
  city: string;
  category: UtilityCategory;
  state: ZoneState;
  distinct_reporters: number;
  weighted_score: number;
  state_since: string;
  updated_at: string;
}

/**
 * User Profile record in public.profiles
 */
export interface UserProfile {
  id: string;
  trust_score: number;
  tier: TrustTier;
  home_h3: string | null;
  home_h3_changed_at: string | null;
  device_id_hash?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Attestation Verification Result
 */
export interface AttestationVerificationResult {
  valid: boolean;
  provider?: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Action Token for one-tap restore votes
 */
export interface ActionTokenPayload {
  sub: string;       // user_id
  dev: string;       // device_id
  h3: string;        // h3_index
  cat: UtilityCategory;
  vid: string;       // unique vote nonce/uuid for single-use guarantee
  iat: number;       // issued at (epoch seconds)
  exp: number;       // expires at (epoch seconds, 15 min lifetime)
}

/**
 * Push Subscription Record in public.push_subscriptions
 */
export interface PushSubscriptionRecord {
  id: string;
  user_id?: string | null;
  device_id?: string | null;
  kind: 'webpush' | 'fcm';
  token_or_endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  } | null;
  h3_subscriptions: string[];
  categories: UtilityCategory[];
  allow_night_alerts: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Incoming event trigger payload for `notify-zone`
 */
export interface NotifyZoneEventPayload {
  event_id?: string;
  h3_index: string;
  category: UtilityCategory;
  from_state: ZoneState;
  to_state: ZoneState;
  at?: string;
  interactive?: boolean; // When true, send 30-min restoration inquiry with action tokens
}

/**
 * Push notification payload sent to client / service worker
 */
export interface NotificationMessagePayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data: {
    type: 'status_alert' | 'interactive_confirmation';
    h3_index: string;
    category: UtilityCategory;
    state?: ZoneState;
    action_token?: string;
    restore_url?: string;
    timestamp?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}
