/**
 * Halchal - Official Regulatory Price Fetcher
 * Architecture: ADR-0017 / Evergreen Content Layer
 *
 * Pulls the latest official benchmark price from Supabase `official_prices` table.
 * Adheres strictly to the rule: "Never hard-code a price in text."
 */

import { getSupabaseServerClient, getSupabaseServiceClient } from './supabase';

export interface OfficialPriceRecord {
  item: string;
  price_bdt: number;
  effective_from: string;
  source_url: string;
  is_live: boolean;
}

// Fallback baseline reflecting latest database seed (used only if database is unreachable)
const REGULATORY_BASELINE: OfficialPriceRecord = {
  item: 'BERC ১২ কেজি এলপিজি সরকারি নির্ধারিত ভোক্তা মূল্য',
  price_bdt: 1455.0,
  effective_from: '2026-11-01',
  source_url: 'https://berc.org.bd',
  is_live: false,
};

export async function getLatestOfficialLpgPrice(): Promise<OfficialPriceRecord> {
  // 1. Try service-role client first if available (bypasses RLS)
  const serviceClient = getSupabaseServiceClient();
  if (serviceClient) {
    try {
      const { data, error } = await serviceClient
        .from('official_prices')
        .select('item, price_bdt, effective_from, source_url')
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (!error && data && data.price_bdt) {
        return {
          item: data.item,
          price_bdt: Number(data.price_bdt),
          effective_from: data.effective_from,
          source_url: data.source_url || 'https://berc.org.bd',
          is_live: true,
        };
      }
    } catch {
      // Continue to next fallback strategy
    }
  }

  // 2. Try standard server client
  try {
    const serverClient = getSupabaseServerClient();
    const { data, error } = await serverClient
      .from('official_prices')
      .select('item, price_bdt, effective_from, source_url')
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (!error && data && data.price_bdt) {
      return {
        item: data.item,
        price_bdt: Number(data.price_bdt),
        effective_from: data.effective_from,
        source_url: data.source_url || 'https://berc.org.bd',
        is_live: true,
      };
    }
  } catch {
    // Continue
  }

  // 3. Fallback to baseline
  return REGULATORY_BASELINE;
}
