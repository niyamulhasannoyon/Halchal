/**
 * Halchal - Editorial Stale Content Audit Tool
 * Documentation: docs/seo/EDITORIAL.md
 *
 * Scans all registered evergreen guides and verifies that their
 * "lastReviewed" date is within the mandatory 90-day threshold.
 * Exits with code 1 if any stale content is detected.
 */

import { EVERGREEN_GUIDES, GuideMetadata } from '../web/src/data/guides';

export interface AuditResult {
  slug: string;
  title: string;
  lastReviewed: string;
  daysOld: number;
  isStale: boolean;
}

export function auditGuides(
  guides: GuideMetadata[] = EVERGREEN_GUIDES,
  currentDate: Date = new Date()
): { results: AuditResult[]; hasStaleContent: boolean } {
  const MAX_ALLOWED_AGE_DAYS = 90;

  const results: AuditResult[] = guides.map((guide) => {
    const reviewedTime = new Date(guide.lastReviewed).getTime();
    const currentTime = currentDate.getTime();
    const diffMs = currentTime - reviewedTime;
    const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isStale = daysOld > MAX_ALLOWED_AGE_DAYS;

    return {
      slug: guide.slug,
      title: guide.title,
      lastReviewed: guide.lastReviewed,
      daysOld,
      isStale,
    };
  });

  const hasStaleContent = results.some((r) => r.isStale);

  return { results, hasStaleContent };
}

export function runCliAudit() {
  console.log('='.repeat(78));
  console.log(' Halchal Editorial Audit — Evergreen Guides Freshness Check (<= 90 Days)');
  console.log('='.repeat(78));

  const { results, hasStaleContent } = auditGuides();

  console.log(
    `| ${'Slug'.padEnd(35)} | ${'Last Reviewed'.padEnd(13)} | ${'Days Old'.padEnd(8)} | ${'Status'.padEnd(10)} |`
  );
  console.log(`|${'-'.repeat(37)}|${'-'.repeat(15)}|${'-'.repeat(10)}|${'-'.repeat(12)}|`);

  for (const item of results) {
    const statusLabel = item.isStale ? '\x1b[31mSTALE (>90d)\x1b[0m' : '\x1b[32mFRESH\x1b[0m';
    console.log(
      `| ${item.slug.padEnd(35)} | ${item.lastReviewed.padEnd(13)} | ${String(item.daysOld).padStart(6)} d | ${statusLabel.padEnd(19)} |`
    );
  }

  console.log('='.repeat(78));

  if (hasStaleContent) {
    console.error('\n❌ AUDIT FAILED: One or more pages have exceeded the 90-day review limit.');
    console.error('Please review, update citations, and bump "lastReviewed" in web/src/data/guides.ts.\n');
    process.exit(1);
  } else {
    console.log('\n✅ AUDIT PASSED: All evergreen guides are strictly fresh and within 90 days.\n');
    process.exit(0);
  }
}

// Execute when invoked directly
if (typeof require !== 'undefined' && require.main === module) {
  runCliAudit();
} else if (process.argv[1] && process.argv[1].endsWith('check-stale-content.ts')) {
  runCliAudit();
}
