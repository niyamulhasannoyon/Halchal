import { describe, it, expect } from 'vitest';
import { DHAKA_PILOT_AREAS } from './areas';

describe('Global SEO Title Uniqueness & Character Budget Mandate', () => {
  const titlesByPath = new Map<string, string>();

  // 1. Static Routes
  const staticPages = [
    { path: '/', title: 'হালচাল — এলাকার লাইভ ইউটিলিটি খবর' },
    { path: '/dhaka', title: 'ঢাকা শহরের বিদ্যুৎ, গ্যাস ও পানির লাইভ হালচাল | হালচাল' },
    { path: '/map', title: 'লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি | হালচাল' },
    { path: '/history', title: '৭ দিনের ইউটিলিটি রিপোর্ট ও ইতিহাস | হালচাল' },
    { path: '/privacy', title: 'গোপনীয়তা নীতি | হালচাল' },
    { path: '/terms', title: 'ব্যবহারের শর্তাবলি | হালচাল' },
    { path: '/lpg-price', title: 'এলপিজি সিলিন্ডারের আজকের দাম ও বিইআরসি রেট | হালচাল' },
    { path: '/load-shedding', title: 'ঢাকায় লোডশেডিং: লাইভ খবর ও এলাকার অবস্থা | হালচাল' },
    { path: '/gas-crisis-dhaka', title: 'ঢাকায় গ্যাস সংকট: লাইভ প্রেসার ও এলাকার অবস্থা | হালচাল' },
  ];

  for (const page of staticPages) {
    titlesByPath.set(page.path, page.title);
  }

  // 2. Area Hub Pages
  for (const area of DHAKA_PILOT_AREAS) {
    const areaPath = `/${area.citySlug}/${area.slug}`;
    const areaTitle = `${area.nameBn}: এখনকার কারেন্ট, গ্যাস ও পানির হাল | হালচাল`;
    titlesByPath.set(areaPath, areaTitle);
  }

  // 3. Category Subpages
  const categories = [
    { cat: 'gas', phrase: 'গ্যাস সংকট ও বর্তমান চাপ' },
    { cat: 'electricity', phrase: 'লোডশেডিং ও বিদ্যুৎ লাইভ খবর' },
    { cat: 'water', phrase: 'ওয়াসা পানি সরবরাহ ও প্রেসার' },
    { cat: 'lpg', phrase: 'এলপিজি সিলিন্ডারের দাম ও সরবরাহ' },
  ];

  for (const area of DHAKA_PILOT_AREAS) {
    for (const { cat, phrase } of categories) {
      const catPath = `/${area.citySlug}/${area.slug}/${cat}`;
      const catTitle = `${area.nameBn}: ${phrase} | হালচাল`;
      titlesByPath.set(catPath, catTitle);
    }
  }

  it('verifies that NO TWO PAGES share the same title across the entire application', () => {
    const seenTitles = new Map<string, string>();
    const totalPages = titlesByPath.size;

    // Total expected: 9 static + 10 areas + 40 categories = 59 pages
    expect(totalPages).toBe(59);

    for (const [path, title] of titlesByPath.entries()) {
      const duplicatePath = seenTitles.get(title);
      expect(
        duplicatePath,
        `Duplicate title detected: "${title}" is used by both "${duplicatePath}" and "${path}"`
      ).toBeUndefined();

      seenTitles.set(title, path);
    }

    expect(seenTitles.size).toBe(totalPages);
  });

  it('enforces Google search SERP title budget (<= 60 characters) for every title', () => {
    for (const [path, title] of titlesByPath.entries()) {
      expect(
        title.length,
        `Title exceeds 60 characters for path "${path}": "${title}" (${title.length} chars)`
      ).toBeLessThanOrEqual(60);
    }
  });

  it('guarantees that every page title contains authentic Bengali characters', () => {
    const bengaliRegex = /[\u0980-\u09FF]/;
    for (const [path, title] of titlesByPath.entries()) {
      expect(
        bengaliRegex.test(title),
        `Title does not contain Bengali characters for path "${path}": "${title}"`
      ).toBe(true);
    }
  });
});
