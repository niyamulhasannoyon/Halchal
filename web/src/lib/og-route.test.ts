/**
 * Halchal - Dynamic Share Card (/api/og) Route Automated Tests
 *
 * Verifies:
 * 1. Fetches each public route's OG image URL
 * 2. Asserts HTTP 200 (never 500, even for unknown zones)
 * 3. Asserts Content-Type: image/png
 * 4. Asserts dimensions: exactly 1200x630 via PNG IHDR chunk inspection
 * 5. Asserts caching headers: s-maxage=300, stale-while-revalidate=600
 * 6. Asserts fast rendering performance (<1s p95)
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/og/route';
import { DHAKA_SEED_ZONES } from '@/lib/zones';
import { siteConfig } from '@/config/site';

function parsePngDimensions(buffer: Buffer): { width: number; height: number; isValidPng: boolean } {
  // Check 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isSignatureValid =
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isSignatureValid) {
    return { width: 0, height: 0, isValidPng: false };
  }

  // IHDR chunk: width at byte 16 (UInt32BE), height at byte 20 (UInt32BE)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return {
    width,
    height,
    isValidPng: true,
  };
}

describe('Open Graph Route (/api/og) Automated Verification', () => {
  const publicRoutes = [
    { name: 'Root Home Page (/)', url: `${siteConfig.url}/api/og` },
    { name: 'Live Map (/map)', url: `${siteConfig.url}/api/og?route=map` },
    { name: '7-Day History (/history)', url: `${siteConfig.url}/api/og?route=history` },
    { name: 'Privacy Policy (/privacy)', url: `${siteConfig.url}/api/og?route=privacy` },
    { name: 'Terms of Service (/terms)', url: `${siteConfig.url}/api/og?route=terms` },
    {
      name: 'Dhanmondi Zone (/z/883cf10ca1fffff)',
      url: `${siteConfig.url}/api/og?h3=883cf10ca1fffff`,
    },
    {
      name: 'Mohammadpur Zone (/z/883cf10cebfffff)',
      url: `${siteConfig.url}/api/og?h3=883cf10cebfffff`,
    },
    {
      name: 'Mirpur 10 Zone (/z/883cf10eb1fffff)',
      url: `${siteConfig.url}/api/og?h3=883cf10eb1fffff`,
    },
    {
      name: 'Gulshan 2 Zone (/z/883cf13b27fffff)',
      url: `${siteConfig.url}/api/og?h3=883cf13b27fffff`,
    },
  ];

  for (const route of publicRoutes) {
    it(`renders valid 1200x630 PNG for ${route.name} in < 1s with correct cache headers`, async () => {
      const startTime = performance.now();
      const req = new NextRequest(route.url);
      const res = await GET(req);
      const durationMs = performance.now() - startTime;

      // Status must be 200
      expect(res.status).toBe(200);

      // Fast response guarantee (< 1000ms p95)
      expect(durationMs).toBeLessThan(1000);

      // Content-Type must be image/png
      expect(res.headers.get('content-type')).toBe('image/png');

      // Cache headers: s-maxage=300, stale-while-revalidate=600
      const cacheControl = res.headers.get('cache-control') || '';
      expect(cacheControl).toContain('s-maxage=300');
      expect(cacheControl).toContain('stale-while-revalidate=600');

      // Validate binary PNG payload & exact dimensions
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { width, height, isValidPng } = parsePngDimensions(buffer);

      expect(isValidPng).toBe(true);
      expect(width).toBe(1200);
      expect(height).toBe(630);
    });
  }

  it('gracefully returns 200 OK fallback image for unknown zone without throwing 500 error', async () => {
    const unknownZoneUrl = `${siteConfig.url}/api/og?h3=883cf9999999999`;
    const req = new NextRequest(unknownZoneUrl);
    const res = await GET(req);

    // CRITICAL: Must NEVER 500 for an unknown zone!
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('x-fallback')).toBe('true');

    const cacheControl = res.headers.get('cache-control') || '';
    expect(cacheControl).toContain('s-maxage=300');
    expect(cacheControl).toContain('stale-while-revalidate=600');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { width, height, isValidPng } = parsePngDimensions(buffer);

    expect(isValidPng).toBe(true);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });

  it('gracefully returns fallback image when invalid non-hex zone string is passed', async () => {
    const invalidZoneUrl = `${siteConfig.url}/api/og?h3=malformed_xyz_123`;
    const req = new NextRequest(invalidZoneUrl);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('x-fallback')).toBe('true');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { width, height, isValidPng } = parsePngDimensions(buffer);

    expect(isValidPng).toBe(true);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });
});
