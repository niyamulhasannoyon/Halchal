/**
 * Halchal - H3 Spatial & Zone Management Utilities
 * Resolution: Uber H3 Res 8 (~0.74 km² area, ~460m edge length)
 * Architecture: ADR-0001, ADR-0003, ADR-0008
 */

import { UtilityCategory, ZoneDisplayState } from './theme';

export interface ZoneCategoryStatus {
  category: UtilityCategory;
  state: ZoneDisplayState;
  distinct_reporters: number;
  weighted_score: number;
  state_since: string;
  updated_at: string;
}

export interface ZoneStatusResponse {
  h3_index: string;
  area_name_bn: string;
  ward: string;
  city: string;
  updated_at: string;
  categories: Record<UtilityCategory, ZoneCategoryStatus>;
  cached: boolean;
  cache_note: string;
  is_stale?: boolean;
}

export interface SeedZone {
  h3_index: string;
  slug: string;
  area_name_bn: string;
  ward: string;
  city: string;
  lat: number;
  lng: number;
}

/**
 * 10 authentic Dhaka Uber H3 Resolution 8 zones seeded in Postgres
 * Migration: 20261119000004_seed_dhaka_zones.sql, 20261120000008_add_zone_slugs_and_redirects.sql
 */
export const DHAKA_SEED_ZONES: SeedZone[] = [
  {
    h3_index: '883cf10ca1fffff',
    slug: 'dhanmondi',
    area_name_bn: 'ধানমন্ডি',
    ward: 'ওয়ার্ড ১৫',
    city: 'ঢাকা',
    lat: 23.746177,
    lng: 90.373828,
  },
  {
    h3_index: '883cf10eb1fffff',
    slug: 'mirpur-10',
    area_name_bn: 'মিরপুর ১০',
    ward: 'ওয়ার্ড ১৪',
    city: 'ঢাকা',
    lat: 23.805694,
    lng: 90.36808,
  },
  {
    h3_index: '883cf10c93fffff',
    slug: 'gulshan-1',
    area_name_bn: 'গুলশান ১',
    ward: 'ওয়ার্ড ১৯',
    city: 'ঢাকা',
    lat: 23.774661,
    lng: 90.41398,
  },
  {
    h3_index: '883cf13b27fffff',
    slug: 'gulshan-2',
    area_name_bn: 'গুলশান ২',
    ward: 'ওয়ার্ড ১৮',
    city: 'ঢাকা',
    lat: 23.789469,
    lng: 90.414935,
  },
  {
    h3_index: '883cf13b25fffff',
    slug: 'banani',
    area_name_bn: 'বনানী',
    ward: 'ওয়ার্ড ১৯',
    city: 'ঢাকা',
    lat: 23.789755,
    lng: 90.405373,
  },
  {
    h3_index: '883cf10583fffff',
    slug: 'uttara-sector-3',
    area_name_bn: 'উত্তরা সেক্টর ৩',
    ward: 'ওয়ার্ড ১',
    city: 'ঢাকা',
    lat: 23.871592,
    lng: 90.396279,
  },
  {
    h3_index: '883cf10cebfffff',
    slug: 'mohammadpur',
    area_name_bn: 'মোহাম্মদপুর',
    ward: 'ওয়ার্ড ৩১',
    city: 'ঢাকা',
    lat: 23.768818,
    lng: 90.360917,
  },
  {
    h3_index: '883cf10cbdfffff',
    slug: 'farmgate',
    area_name_bn: 'ফার্মগেট',
    ward: 'ওয়ার্ড ২৬',
    city: 'ঢাকা',
    lat: 23.753158,
    lng: 90.388645,
  },
  {
    h3_index: '883cf13941fffff',
    slug: 'badda',
    area_name_bn: 'বাড্ডা',
    ward: 'ওয়ার্ড ২১',
    city: 'ঢাকা',
    lat: 23.781637,
    lng: 90.428801,
  },
  {
    h3_index: '883cf1766bfffff',
    slug: 'lalbagh',
    area_name_bn: 'লালবাগ',
    ward: 'ওয়ার্ড ২৪',
    city: 'ঢাকা',
    lat: 23.71598,
    lng: 90.39104,
  },
];

export const DEFAULT_DHAKA_ZONE = DHAKA_SEED_ZONES[0]; // ধানমন্ডি

const HOME_ZONE_STORAGE_KEY = 'halchal_home_zone_h3';

export function getStoredHomeZone(): string | null {
  if (typeof window === 'undefined') return null;
  const direct = localStorage.getItem(HOME_ZONE_STORAGE_KEY);
  if (direct) return direct;
  try {
    const selected = localStorage.getItem('halchal-selected-zone');
    if (selected) {
      const parsed = JSON.parse(selected);
      if (parsed?.h3_index) return parsed.h3_index;
    }
  } catch {}
  return DEFAULT_DHAKA_ZONE.h3_index;
}

export function setStoredHomeZone(h3Index: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HOME_ZONE_STORAGE_KEY, h3Index);
}

/**
 * Validates whether a string is a valid H3 Resolution 8 index
 * Fast pattern check (15 hex characters starting with 88) avoiding h3-js import in client bundles
 */
export function isValidH3Zone(h3Index: string | null | undefined): boolean {
  if (!h3Index || typeof h3Index !== 'string') return false;
  return /^88[0-9a-fA-F]{13}$/.test(h3Index);
}

/**
 * Look up metadata for a known seed zone
 */
export function getZoneMetadata(h3Index: string): SeedZone | null {
  return DHAKA_SEED_ZONES.find((z) => z.h3_index === h3Index) ?? null;
}

/**
 * Finds the nearest known seed zone by Euclidean distance
 */
export function findNearestZone(lat: number, lng: number): SeedZone {
  let nearest = DEFAULT_DHAKA_ZONE;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const zone of DHAKA_SEED_ZONES) {
    const dLat = zone.lat - lat;
    const dLng = zone.lng - lng;
    const distanceSq = dLat * dLat + dLng * dLng;
    if (distanceSq < minDistance) {
      minDistance = distanceSq;
      nearest = zone;
    }
  }

  return nearest;
}

/**
 * Generates an empty or sample status response for a zone
 */
export function createDefaultZoneStatus(
  h3Index: string,
  overrides?: Partial<ZoneStatusResponse>
): ZoneStatusResponse {
  const meta = getZoneMetadata(h3Index);
  const now = new Date().toISOString();

  const categories: Record<UtilityCategory, ZoneCategoryStatus> = {
    electricity: {
      category: 'electricity',
      state: 'unknown',
      distinct_reporters: 0,
      weighted_score: 0,
      state_since: now,
      updated_at: now,
    },
    gas: {
      category: 'gas',
      state: 'unknown',
      distinct_reporters: 0,
      weighted_score: 0,
      state_since: now,
      updated_at: now,
    },
    water: {
      category: 'water',
      state: 'unknown',
      distinct_reporters: 0,
      weighted_score: 0,
      state_since: now,
      updated_at: now,
    },
    lpg: {
      category: 'lpg',
      state: 'unknown',
      distinct_reporters: 0,
      weighted_score: 0,
      state_since: now,
      updated_at: now,
    },
  };

  return {
    h3_index: h3Index,
    area_name_bn: meta?.area_name_bn ?? 'অজানা এলাকা',
    ward: meta?.ward ?? 'ওয়ার্ড অজ্ঞাত',
    city: meta?.city ?? 'ঢাকা',
    updated_at: now,
    categories,
    cached: false,
    cache_note: 'DB reads are cached',
    ...overrides,
  };
}
