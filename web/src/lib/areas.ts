/**
 * Halchal - Area Architecture & Spatial Slug Mappings
 * Resolution: Uber H3 Res 8 (~0.74 km² area) mapped to Human-Readable Slugs
 * Architecture: Technical SEO Foundation (ADR-0017)
 */

export interface AreaInfo {
  slug: string;
  citySlug: string; // e.g. 'dhaka'
  cityNameBn: string; // e.g. 'ঢাকা'
  nameBn: string; // e.g. 'মোহাম্মদপুর'
  ward: string;
  h3Cells: string[]; // One or more H3 Res 8 cells
  primaryH3: string;
  neighborSlugs: string[];
  lat: number;
  lng: number;
}

/**
 * Dhaka Metropolitan Pilot Areas
 * Mapped to authentic Uber H3 Resolution 8 cells (~0.74 km² each)
 */
export const DHAKA_PILOT_AREAS: AreaInfo[] = [
  {
    slug: 'mohammadpur',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'মোহাম্মদপুর',
    ward: 'ওয়ার্ড ৩১',
    h3Cells: ['883cf10cebfffff'],
    primaryH3: '883cf10cebfffff',
    neighborSlugs: ['dhanmondi', 'farmgate', 'mirpur-10'],
    lat: 23.768818,
    lng: 90.360917,
  },
  {
    slug: 'dhanmondi',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'ধানমন্ডি',
    ward: 'ওয়ার্ড ১৫',
    h3Cells: ['883cf10ca1fffff'],
    primaryH3: '883cf10ca1fffff',
    neighborSlugs: ['mohammadpur', 'farmgate', 'lalbagh'],
    lat: 23.746177,
    lng: 90.373828,
  },
  {
    slug: 'mirpur-10',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'মিরপুর ১০',
    ward: 'ওয়ার্ড ১৪',
    h3Cells: ['883cf10eb1fffff'],
    primaryH3: '883cf10eb1fffff',
    neighborSlugs: ['mohammadpur', 'farmgate', 'uttara-sector-3'],
    lat: 23.805694,
    lng: 90.36808,
  },
  {
    slug: 'gulshan-1',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'গুলশান ১',
    ward: 'ওয়ার্ড ১৯',
    h3Cells: ['883cf10c93fffff'],
    primaryH3: '883cf10c93fffff',
    neighborSlugs: ['gulshan-2', 'banani', 'badda'],
    lat: 23.774661,
    lng: 90.41398,
  },
  {
    slug: 'gulshan-2',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'গুলশান ২',
    ward: 'ওয়ার্ড ১৮',
    h3Cells: ['883cf13b27fffff'],
    primaryH3: '883cf13b27fffff',
    neighborSlugs: ['gulshan-1', 'banani', 'badda'],
    lat: 23.789469,
    lng: 90.414935,
  },
  {
    slug: 'banani',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'বনানী',
    ward: 'ওয়ার্ড ১৯',
    h3Cells: ['883cf13b25fffff'],
    primaryH3: '883cf13b25fffff',
    neighborSlugs: ['gulshan-1', 'gulshan-2', 'farmgate'],
    lat: 23.789755,
    lng: 90.405373,
  },
  {
    slug: 'uttara-sector-3',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'উত্তরা সেক্টর ৩',
    ward: 'ওয়ার্ড ১',
    h3Cells: ['883cf10583fffff'],
    primaryH3: '883cf10583fffff',
    neighborSlugs: ['mirpur-10', 'banani'],
    lat: 23.871592,
    lng: 90.396279,
  },
  {
    slug: 'farmgate',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'ফার্মগেট',
    ward: 'ওয়ার্ড ২৬',
    h3Cells: ['883cf10cbdfffff'],
    primaryH3: '883cf10cbdfffff',
    neighborSlugs: ['dhanmondi', 'mohammadpur', 'banani'],
    lat: 23.753158,
    lng: 90.388645,
  },
  {
    slug: 'badda',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'বাড্ডা',
    ward: 'ওয়ার্ড ২১',
    h3Cells: ['883cf13941fffff'],
    primaryH3: '883cf13941fffff',
    neighborSlugs: ['gulshan-1', 'gulshan-2'],
    lat: 23.781637,
    lng: 90.428801,
  },
  {
    slug: 'lalbagh',
    citySlug: 'dhaka',
    cityNameBn: 'ঢাকা',
    nameBn: 'লালবাগ',
    ward: 'ওয়ার্ড ২৪',
    h3Cells: ['883cf1766bfffff'],
    primaryH3: '883cf1766bfffff',
    neighborSlugs: ['dhanmondi'],
    lat: 23.71598,
    lng: 90.39104,
  },
];

/**
 * Legacy/alternative slug alias mappings for 301 Permanent Redirects
 */
export const AREA_SLUG_REDIRECTS: Record<string, Record<string, string>> = {
  dhaka: {
    mirpur: 'mirpur-10',
    gulshan: 'gulshan-1',
    uttara: 'uttara-sector-3',
  },
};

/**
 * Validates whether a slug conforms to URL-safe Latin transliteration standards:
 * Lowercase alphanumeric characters with hyphens, no consecutive hyphens.
 */
export function isValidSlug(slug: string | null | undefined): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Resolves an area by its city slug and area slug
 */
export function getAreaBySlug(city: string, slug: string): AreaInfo | null {
  const cleanCity = (city || '').toLowerCase();
  const cleanSlug = (slug || '').toLowerCase();

  if (cleanCity !== 'dhaka') {
    return null;
  }

  return DHAKA_PILOT_AREAS.find((area) => area.slug === cleanSlug) ?? null;
}

/**
 * Finds the corresponding AreaInfo for an H3 cell index
 */
export function getAreaByH3(h3Index: string): AreaInfo | null {
  const cleanH3 = (h3Index || '').toLowerCase();
  return DHAKA_PILOT_AREAS.find((area) => area.h3Cells.includes(cleanH3)) ?? null;
}

/**
 * Retrieves all areas for a given city
 */
export function getAllAreasForCity(city: string): AreaInfo[] {
  const cleanCity = (city || '').toLowerCase();
  if (cleanCity === 'dhaka') {
    return DHAKA_PILOT_AREAS;
  }
  return [];
}

/**
 * Checks whether an old/alternative slug should be 301 redirected
 */
export function resolveSlugRedirect(city: string, slug: string): string | null {
  const cleanCity = (city || '').toLowerCase();
  const cleanSlug = (slug || '').toLowerCase();

  const cityRedirects = AREA_SLUG_REDIRECTS[cleanCity];
  if (cityRedirects && cityRedirects[cleanSlug]) {
    return cityRedirects[cleanSlug];
  }

  return null;
}

/**
 * City metadata lookup
 */
export function getCityMetadata(city: string): { citySlug: string; nameBn: string } | null {
  const cleanCity = (city || '').toLowerCase();
  if (cleanCity === 'dhaka') {
    return {
      citySlug: 'dhaka',
      nameBn: 'ঢাকা',
    };
  }
  return null;
}
