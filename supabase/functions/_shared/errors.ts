/**
 * Halchal (হালচাল) - Bengali-First Error Definitions & Database Error Mappings
 * CLAUDE.md: "All customer-facing strings must be in Bengali and centralized."
 */

import { corsHeaders } from './cors.ts';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly bengaliMessage: string,
    public readonly details?: unknown
  ) {
    super(bengaliMessage);
    this.name = 'AppError';
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: this.bengaliMessage,
        code: this.code,
        details: this.details ?? null,
      }),
      {
        status: this.statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

/**
 * Predefined Application Errors
 */
export const Errors = {
  UNAUTHORIZED: () =>
    new AppError(401, 'UNAUTHORIZED', 'প্রবেশাধিকার নেই। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'),

  ATTESTATION_FAILED: (detail?: string) =>
    new AppError(
      403,
      'ATTESTATION_FAILED',
      'ক্লায়েন্ট নিরাপত্তা যাচাইকরণ ব্যর্থ হয়েছে। স্বয়ংক্রিয় অনুরোধ প্রতিরোধ করতে ক্লায়েন্ট যাচাইকরণ আবশ্যক।',
      detail
    ),

  ACCURACY_TOO_LOW: (accuracy_m: number) =>
    new AppError(
      400,
      'ACCURACY_TOO_LOW',
      'জিপিএস নির্ভুলতা ২০০ মিটারের মধ্যে হতে হবে। আরও ভালো সিগন্যালের জন্য অপেক্ষা করুন।',
      { accuracy_m, max_allowed: 200 }
    ),

  COORDINATES_OUT_OF_BOUNDS: () =>
    new AppError(
      400,
      'COORDINATES_OUT_OF_BOUNDS',
      'ভৌগোলিক স্থানাঙ্ক বাংলাদেশের ভৌগোলিক সীমার বাইরে।'
    ),

  HOME_ZONE_LOCKED: (details?: { home_h3?: string; reported_h3?: string; days_remaining?: number }) =>
    new AppError(
      403,
      'HOME_ZONE_LOCKED',
      'আপনি শুধুমাত্র আপনার সংরক্ষিত এলাকা বা পার্শ্ববর্তী এলাকার জন্য রিপোর্ট করতে পারবেন। ৭ দিনের মধ্যে এলাকা পরিবর্তন করা যাবে না (৭ দিন পর পরিবর্তন সম্ভব)।',
      details
    ),

  RATE_LIMITED_USER_15M: () =>
    new AppError(429, 'RATE_LIMITED_USER_15M', '১৫ মিনিটে একবারই রিপোর্ট করা যাবে'),

  RATE_LIMITED_DEVICE_15M: () =>
    new AppError(429, 'RATE_LIMITED_DEVICE_15M', '১৫ মিনিটে একবারই রিপোর্ট করা যাবে'),

  IP_BURST_LIMITED: () =>
    new AppError(
      429,
      'IP_BURST_LIMITED',
      'অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।'
    ),

  TOKEN_ALREADY_USED: () =>
    new AppError(409, 'TOKEN_ALREADY_USED', 'এই ভোটের লিংকটি ইতিমধ্যে ব্যবহার করা হয়েছে।'),

  TOKEN_EXPIRED: () =>
    new AppError(401, 'TOKEN_EXPIRED', 'ভোটের লিংকের মেয়াদ শেষ হয়ে গেছে।'),

  INVALID_ACTION_TOKEN: (detail?: string) =>
    new AppError(403, 'INVALID_ACTION_TOKEN', detail || 'ভোটের লিংকটি সঠিক নয়।', detail),

  INTERNAL_ERROR: (msg?: string) =>
    new AppError(
      500,
      'INTERNAL_SERVER_ERROR',
      'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      msg
    ),
};

/**
 * Maps PostgreSQL Database Error Codes and Details from RPC `submit_report` to HTTP AppErrors
 */
export function mapDatabaseError(err: { code?: string; message?: string; details?: string }): AppError {
  const code = err.code || '';
  const message = err.message || '';
  const details = err.details || '';

  // 15-minute rate limit for user
  if (code === 'P0015' || details === 'RATE_LIMITED_USER_15M' || message.includes('DUPLICATE_REPORT_RATE_LIMIT')) {
    return Errors.RATE_LIMITED_USER_15M();
  }

  // 15-minute rate limit for device
  if (code === 'P0016' || details === 'RATE_LIMITED_DEVICE_15M' || message.includes('DUPLICATE_DEVICE_RATE_LIMIT')) {
    return Errors.RATE_LIMITED_DEVICE_15M();
  }

  // Identity validation
  if (code === 'P0001' || details === 'IDENTITY_REQUIRED' || message.includes('INVALID_REPORTER_IDENTITY')) {
    return new AppError(400, 'IDENTITY_REQUIRED', 'রিপোর্টারের পরিচয় সঠিকভাবে পাওয়া যায়নি');
  }

  // Future timestamp
  if (code === 'P0002' || details === 'TIMESTAMP_IN_FUTURE' || message.includes('FUTURE_TIMESTAMP')) {
    return new AppError(400, 'TIMESTAMP_IN_FUTURE', 'ভবিষ্যতের সময় দিয়ে রিপোর্ট করা যাবে না');
  }

  // Stale timestamp (> 30 min old)
  if (code === 'P0003' || details === 'TIMESTAMP_TOO_OLD' || message.includes('STALE_TIMESTAMP')) {
    return new AppError(400, 'TIMESTAMP_TOO_OLD', 'রিপোর্টের সময় ৩০ মিনিটের বেশি পুরোনো');
  }

  // Unknown H3 zone
  if (code === 'P0004' || details === 'UNKNOWN_H3_ZONE' || message.includes('ZONE_NOT_FOUND')) {
    return new AppError(404, 'UNKNOWN_H3_ZONE', 'এলাকাটি হালচালের মানচিত্রে অন্তর্ভুক্ত নয়');
  }

  // Invalid LPG price
  if (code === 'P0005' || details === 'PRICE_OUT_OF_RANGE' || message.includes('INVALID_LPG_PRICE')) {
    return new AppError(400, 'PRICE_OUT_OF_RANGE', 'এলপিজি সিলিন্ডারের দাম ৫০০ থেকে ৬০০০ টাকার মধ্যে হতে হবে');
  }

  // Price forbidden on non-LPG category
  if (code === 'P0006' || details === 'PRICE_FORBIDDEN_FOR_CATEGORY' || message.includes('PRICE_NOT_ALLOWED')) {
    return new AppError(400, 'PRICE_FORBIDDEN_FOR_CATEGORY', 'শুধুমাত্র এলপিজি ক্যাটাগরিতে দাম উল্লেখ করা যাবে');
  }

  // Generic fallback
  return Errors.INTERNAL_ERROR(message);
}
