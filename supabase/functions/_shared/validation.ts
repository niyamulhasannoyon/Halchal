/**
 * Halchal (হালচাল) - Strict Input Validation Module (Zod)
 * Validates report contracts, bounds, timestamps, and accuracy limits.
 */

import { z } from 'zod';
import { SubmitReportRequest } from './types.ts';
import { AppError, Errors } from './errors.ts';

// Bangladesh approximate geographic bounding box
const BD_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLng: 88.0,
  maxLng: 92.7,
};

const UtilityCategoryEnum = z.enum(['electricity', 'gas', 'water', 'lpg'], {
  errorMap: () => ({ message: 'অবৈধ ক্যাটাগরি (শুধুমাত্র electricity, gas, water, lpg অনুমোদিত)' }),
});

const ReportStateEnum = z.enum(['ok', 'low', 'out'], {
  errorMap: () => ({ message: 'অবৈধ অবস্থা (শুধুমাত্র ok, low, out অনুমোদিত)' }),
});

const AttestationSchema = z.union([
  z.string().min(1, 'অ্যাটেস্টেশন টোকেন খালি হতে পারে না'),
  z.object({
    provider: z.enum(['turnstile', 'play_integrity', 'mock']),
    token: z.string().min(1, 'অ্যাটেস্টেশন টোকেন খালি হতে পারে না'),
    packageName: z.string().optional(),
    valid: z.boolean().optional(),
  }),
]);

export const SubmitReportSchema = z.object({
  category: UtilityCategoryEnum,
  state: ReportStateEnum,
  price_bdt: z.number().nullable().optional(),
  lat: z.number({ required_error: 'অক্ষাংশ আবশ্যক' })
    .min(BD_BOUNDS.minLat, 'অক্ষাংশ বাংলাদেশের ভৌগোলিক সীমার বাইরে')
    .max(BD_BOUNDS.maxLat, 'অক্ষাংশ বাংলাদেশের ভৌগোলিক সীমার বাইরে'),
  lng: z.number({ required_error: 'দ্রাঘিমাংশ আবশ্যক' })
    .min(BD_BOUNDS.minLng, 'দ্রাঘিমাংশ বাংলাদেশের ভৌগোলিক সীমার বাইরে')
    .max(BD_BOUNDS.maxLng, 'দ্রাঘিমাংশ বাংলাদেশের ভৌগোলিক সীমার বাইরে'),
  accuracy_m: z.number({ required_error: 'জিপিএস নির্ভুলতা আবশ্যক' })
    .min(0, 'জিপিএস নির্ভুলতা ঋণাত্মক হতে পারে না'),
  client_ts: z.string({ required_error: 'টাইমস্ট্যাম্প আবশ্যক' }),
  device_id: z.string({ required_error: 'ডিভাইস আইডি আবশ্যক' })
    .uuid('ডিভাইস আইডি সঠিক UUID ফরম্যাটে হতে হবে'),
  attestation: AttestationSchema,
  update_home: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // 1. Strict accuracy check: Reject accuracy_m > 200
  if (data.accuracy_m > 200) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accuracy_m'],
      message: 'জিপিএস নির্ভুলতা ২০০ মিটারের মধ্যে হতে হবে। আরও ভালো সিগন্যালের জন্য অপেক্ষা করুন।',
    });
  }

  // 2. LPG price logic:
  // Only LPG is allowed to carry price_bdt, and it must be between 500 and 6000 BDT
  if (data.category === 'lpg') {
    if (data.price_bdt !== undefined && data.price_bdt !== null) {
      if (data.price_bdt < 500 || data.price_bdt > 6000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['price_bdt'],
          message: 'এলপিজি সিলিন্ডারের দাম ৫০০ থেকে ৬০০০ টাকার মধ্যে হতে হবে',
        });
      }
    }
  } else {
    if (data.price_bdt !== undefined && data.price_bdt !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price_bdt'],
        message: 'শুধুমাত্র এলপিজি ক্যাটাগরিতে দাম উল্লেখ করা যাবে',
      });
    }
  }

  // 3. Timestamp validation:
  const parsedTs = Date.parse(data.client_ts);
  if (Number.isNaN(parsedTs)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['client_ts'],
      message: 'ক্লায়েন্ট টাইমস্ট্যাম্প সঠিক ISO ফরম্যাটে নয়',
    });
  } else {
    const now = Date.now();
    // Allow up to 5 seconds clock drift into the future
    if (parsedTs > now + 5000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['client_ts'],
        message: 'ভবিষ্যতের সময় দিয়ে রিপোর্ট করা যাবে না',
      });
    }
    // Reject older than 30 minutes
    if (parsedTs < now - 30 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['client_ts'],
        message: 'রিপোর্টের সময় ৩০ মিনিটের বেশি পুরোনো',
      });
    }
  }
});

export function validateSubmitReportInput(raw: unknown): SubmitReportRequest {
  const result = SubmitReportSchema.safeParse(raw);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue.path.join('.');
    const message = firstIssue.message;

    // Check specific custom errors
    if (path === 'accuracy_m' && firstIssue.message.includes('২০০ মিটারের মধ্যে')) {
      const accuracy = (raw as Record<string, unknown>)?.accuracy_m;
      throw Errors.ACCURACY_TOO_LOW(typeof accuracy === 'number' ? accuracy : 999);
    }

    if ((path === 'lat' || path === 'lng') && message.includes('বাংলাদেশের ভৌগোলিক সীমার বাইরে')) {
      throw Errors.COORDINATES_OUT_OF_BOUNDS();
    }

    if (path === 'price_bdt') {
      if (message.includes('৫০০ থেকে ৬০০০')) {
        throw new AppError(400, 'PRICE_OUT_OF_RANGE', 'এলপিজি সিলিন্ডারের দাম ৫০০ থেকে ৬০০০ টাকার মধ্যে হতে হবে');
      }
      if (message.includes('শুধুমাত্র এলপিজি')) {
        throw new AppError(400, 'PRICE_FORBIDDEN_FOR_CATEGORY', 'শুধুমাত্র এলপিজি ক্যাটাগরিতে দাম উল্লেখ করা যাবে');
      }
    }

    if (path === 'client_ts') {
      if (message.includes('ভবিষ্যতের সময়')) {
        throw new AppError(400, 'TIMESTAMP_IN_FUTURE', 'ভবিষ্যতের সময় দিয়ে রিপোর্ট করা যাবে না');
      }
      if (message.includes('৩০ মিনিটের বেশি')) {
        throw new AppError(400, 'TIMESTAMP_TOO_OLD', 'রিপোর্টের সময় ৩০ মিনিটের বেশি পুরোনো');
      }
    }

    throw new AppError(400, 'INVALID_INPUT', `ভুল তথ্য প্রদান করা হয়েছে: ${message}`, {
      path,
      issues: result.error.issues,
    });
  }

  return result.data as SubmitReportRequest;
}
