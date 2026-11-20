/**
 * Halchal - Evergreen Citizen Guides Data Registry
 * Architecture: ADR-0017 / Trust & Evergreen Content Layer
 *
 * All evergreen guides must be registered here with truthful sources,
 * verified lastReviewed dates, and relevant H3 zone links.
 */

export interface GuideSource {
  name: string;
  url: string;
  verifiedDate: string;
  note?: string;
}

export interface GuideMetadata {
  slug: string;
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  category: 'lpg' | 'gas' | 'electricity' | 'water' | 'general';
  categoryBn: string;
  lastReviewed: string; // ISO format: YYYY-MM-DD
  datePublished?: string;
  dateModified?: string;
  readTimeMinutes: number;
  author: {
    name: string;
    role: string;
  };
  reviewer: {
    name: string;
    role: string;
  };
  sources: GuideSource[];
  relevantZones: Array<{
    nameBn: string;
    h3_index: string;
    ward: string;
  }>;
  summary: string;
}

export const EVERGREEN_GUIDES: GuideMetadata[] = [
  {
    slug: 'lpg-cylinder-price-bd',
    path: '/guides/lpg-cylinder-price-bd',
    title: 'এলপিজি সিলিন্ডারের সরকারি দাম ও বেশি দাম চাইলে কী করবেন',
    metaTitle: 'এলপিজি সিলিন্ডারের সরকারি দাম ও বেশি দাম চাইলে কী করবেন | হালচাল',
    metaDescription:
      'বিইআরসি নির্ধারিত ১২ কেজি এলপিজি সিলিন্ডারের সরকারি মূল্য জানুন। অতিরিক্ত দাম চাইলে ভোক্তা অধিকারে (১৬১২১) অভিযোগ করার নিয়ম ও এলাকার বাজারদরের তুলনা।',
    category: 'lpg',
    categoryBn: 'এলপিজি গ্যাস',
    lastReviewed: '2026-11-20',
    readTimeMinutes: 5,
    author: {
      name: 'হালচাল সম্পাদকীয় দল',
      role: 'নাগরিক সেবা ও ইউটিলিটি গবেষণা সেল',
    },
    reviewer: {
      name: 'হালচাল ফ্যাক্ট-চেক ডেস্ক',
      role: 'জ্বালানি ও ভোক্তা অধিকার নীতিমালা পর্যালোচক',
    },
    sources: [
      {
        name: 'বাংলাদেশ এনার্জি রেগুলেটরি কমিশন (BERC)',
        url: 'https://berc.org.bd',
        verifiedDate: '2026-11-20',
        note: 'প্রতি মাসের এলপিজি সরকারি প্রজ্ঞাপন ও ভোক্তা মূল্য তালিকা',
      },
      {
        name: 'জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তর (DNCRP)',
        url: 'https://dncrp.portal.gov.bd',
        verifiedDate: '2026-11-20',
        note: 'অতিরিক্ত মূল্য ও ওজনে কারচুপির বিরুদ্ধে অভিযোগ প্রক্রিয়া',
      },
    ],
    relevantZones: [
      { nameBn: 'ধানমন্ডি', h3_index: '883cf10ca1fffff', ward: 'ওয়ার্ড ১৫' },
      { nameBn: 'মিরপুর ১০', h3_index: '883cf10eb1fffff', ward: 'ওয়ার্ড ১৪' },
      { nameBn: 'বনানী', h3_index: '883cf13b25fffff', ward: 'ওয়ার্ড ১৯' },
      { nameBn: 'উত্তরা ৩', h3_index: '883cf10583fffff', ward: 'ওয়ার্ড ১' },
    ],
    summary:
      'বিইআরসি কর্তৃক নির্ধারিত ১২ কেজি এলপিজি সিলিন্ডারের সরকারি মূল্য, অতিরিক্ত দাম চাইলে ভোক্তা অধিকারে অভিযোগ দাখিলের কার্যকর ধাপসমূহ এবং হালচালে এলাকার বাজারদর যাচাই।',
  },
  {
    slug: 'low-gas-pressure-safety',
    path: '/guides/low-gas-pressure-safety',
    title: 'গ্যাসের চাপ কম থাকলে নিরাপদে রান্নার উপায়',
    metaTitle: 'গ্যাসের চাপ কম থাকলে নিরাপদে রান্নার উপায় | হালচাল',
    metaDescription:
      'পাইপলাইনে গ্যাসের চাপ কম থাকলে কীভাবে নিরাপদে রান্না করবেন? বিপজ্জনক সাকশন পাম্প পরিহার, সাবান-পানির লিকেজ পরীক্ষা এবং নিরাপদ বিকল্পের প্রামাণ্য নির্দেশিকা।',
    category: 'gas',
    categoryBn: 'পাইপলাইন গ্যাস',
    lastReviewed: '2026-11-20',
    readTimeMinutes: 4,
    author: {
      name: 'হালচাল সম্পাদকীয় দল',
      role: 'জননিরাপত্তা ও নাগরিক ইউটিলিটি সেল',
    },
    reviewer: {
      name: 'হালচাল সেফটি অডিট ডেস্ক',
      role: 'অগ্নি ও গ্যাস পাইপলাইন নিরাপত্তা পর্যালোচক',
    },
    sources: [
      {
        name: 'তিতাস গ্যাস ট্রান্সমিশন অ্যান্ড ডিস্ট্রিবিউশন কোং লিঃ',
        url: 'https://titasgas.org.bd',
        verifiedDate: '2026-11-20',
        note: 'পাইপলাইন গ্যাস নিরাপত্তা নির্দেশিকা ও জরুরি কন্ট্রোল রুম',
      },
      {
        name: 'ফায়ার সার্ভিস ও সিভিল ডিফেন্স অধিদপ্তর',
        url: 'https://fireservice.gov.bd',
        verifiedDate: '2026-11-20',
        note: 'রান্নাঘরে গ্যাস লিকেজ ও অগ্নিদুর্ঘটনা প্রতিরোধ প্রোটোকল',
      },
    ],
    relevantZones: [
      { nameBn: 'ধানমন্ডি', h3_index: '883cf10ca1fffff', ward: 'ওয়ার্ড ১৫' },
      { nameBn: 'মোহাম্মদপুর', h3_index: '883cf10cebfffff', ward: 'ওয়ার্ড ৩১' },
      { nameBn: 'ফার্মগেট', h3_index: '883cf10cbdfffff', ward: 'ওয়ার্ড ২৬' },
      { nameBn: 'মিরপুর ১০', h3_index: '883cf10eb1fffff', ward: 'ওয়ার্ড ১৪' },
    ],
    summary:
      'গ্যাসের লো প্রেশার চলাকালীন মারাত্মক সাকশন পাম্পের ঝুঁকি এড়ানো, রান্নাঘরের ভেন্টিলেশন ও নব চেক, এবং ইলেকট্রিক রান্নার নিরাপদ বিকল্পের ব্যবহারিক নির্দেশিকা।',
  },
  {
    slug: 'load-shedding-water-charge-plan',
    path: '/guides/load-shedding-water-charge-plan',
    title: 'লোডশেডিং হলে পানি ও ফোন চার্জের প্ল্যান',
    metaTitle: 'লোডশেডিং হলে পানি ও ফোন চার্জের প্ল্যান | হালচাল',
    metaDescription:
      'লোডশেডিংয়ে পানির পাম্প বন্ধ ও ফোনের চার্জ শেষ হওয়া এড়াতে ব্যবহারিক প্রস্তুতি। রিজার্ভার ব্যবস্থাপনা, পাওয়ার ব্যাংক সংরক্ষণ ও জরুরি কানেক্টিভিটি বজায় রাখার গাইড।',
    category: 'electricity',
    categoryBn: 'বিদ্যুৎ ও পানি',
    lastReviewed: '2026-11-20',
    readTimeMinutes: 5,
    author: {
      name: 'হালচাল সম্পাদকীয় দল',
      role: 'নগর জীবন ও জরুরি প্রস্তুতি সেল',
    },
    reviewer: {
      name: 'হালচাল টেকনিক্যাল ডেস্ক',
      role: 'গ্রিড ও পাওয়ার ব্যাকআপ পর্যালোচক',
    },
    sources: [
      {
        name: 'ঢাকা পাওয়ার ডিস্ট্রিবিউশন কোম্পানি (DPDC)',
        url: 'https://dpdc.org.bd',
        verifiedDate: '2026-11-20',
        note: 'বিদ্যুৎ সরবরাহ ও শিডিউল ট্র্যাকিং সিস্টেম',
      },
      {
        name: 'ঢাকা ইলেকট্রিক সাপ্লাই কোম্পানি (DESCO)',
        url: 'https://desco.org.bd',
        verifiedDate: '2026-11-20',
        note: 'বিদ্যুৎ বিভ্রাট অভিযোগ ও জরুরি হটলাইন',
      },
      {
        name: 'ঢাকা ওয়াসা (DWASA)',
        url: 'https://dwasa.org.bd',
        verifiedDate: '2026-11-20',
        note: 'পানির পাম্প পরিচালনা ও জরুরি সরবরাহ প্রোটোকল',
      },
    ],
    relevantZones: [
      { nameBn: 'বনানী', h3_index: '883cf13b25fffff', ward: 'ওয়ার্ড ১৯' },
      { nameBn: 'গুলশান ২', h3_index: '883cf13b27fffff', ward: 'ওয়ার্ড ১৮' },
      { nameBn: 'মিরপুর ১০', h3_index: '883cf10eb1fffff', ward: 'ওয়ার্ড ১৪' },
      { nameBn: 'ধানমন্ডি', h3_index: '883cf10ca1fffff', ward: 'ওয়ার্ড ১৫' },
    ],
    summary:
      'বিদ্যুৎ চলে গেলে কীভাবে সময়মতো বাসার পানির রিজার্ভ ম্যানেজ করবেন, ব্যাটারি সাশ্রয়ী উপায়ে ফোন ও পাওয়ার ব্যাংক সচল রাখবেন এবং ২জি/৩জি মোডে হালচাল দেখবেন।',
  },
  {
    slug: 'official-utility-complaint-guide',
    path: '/guides/official-utility-complaint-guide',
    title: 'কীভাবে নিজের এলাকার সমস্যা অফিসিয়ালি জানাবেন',
    metaTitle: 'কীভাবে নিজের এলাকার সমস্যা অফিসিয়ালি জানাবেন | হালচাল',
    metaDescription:
      'বিদ্যুৎ, গ্যাস, পানি ও এলপিজির সমস্যার জন্য ডিপিডিসি, ডেসকো, তিতাস ও ওয়াসার যাচাইকৃত অফিশিয়াল হটলাইন নম্বর ও সরাসরি অভিযোগ জানানোর কার্যকর নিয়মাবলী।',
    category: 'general',
    categoryBn: 'নাগরিক অধিকার',
    lastReviewed: '2026-11-20',
    readTimeMinutes: 5,
    author: {
      name: 'হালচাল সম্পাদকীয় দল',
      role: 'নাগরিক সেবা ও ইউটিলিটি গবেষণা সেল',
    },
    reviewer: {
      name: 'হালচাল লিগ্যাল ও পলিসি ডেস্ক',
      role: 'পাবলিক ইউটিলিটি কমপ্লায়েন্স পর্যালোচক',
    },
    sources: [
      {
        name: 'ডিপিডিসি কেন্দ্রীয় কল সেন্টার (DPDC Call Center)',
        url: 'https://dpdc.org.bd',
        verifiedDate: '2026-11-20',
        note: 'হটলাইন ১৬১১৬ (বিদ্যুৎ বিভ্রাট ও ট্রান্সফরমার ত্রুটি)',
      },
      {
        name: 'ডেসকো কেন্দ্রীয় হেল্পডেস্ক (DESCO Helpdesk)',
        url: 'https://desco.org.bd',
        verifiedDate: '2026-11-20',
        note: 'হটলাইন ১৬১২০ (ঢাকা উত্তরের বিদ্যুৎ অভিযোগ)',
      },
      {
        name: 'তিতাস গ্যাস জরুরি অভিযোগ ও নিয়ন্ত্রণ কক্ষ',
        url: 'https://titasgas.org.bd',
        verifiedDate: '2026-11-20',
        note: 'হটলাইন ১৬৪৯৬ এবং নিয়ন্ত্রণ কক্ষ ০২-২২৩৩-৮৮৯৬০',
      },
      {
        name: 'ঢাকা ওয়াসা লিংক (DWASA Link-16162)',
        url: 'https://dwasa.org.bd',
        verifiedDate: '2026-11-20',
        note: 'হটলাইন ১৬১৬২ (পানির ঘাটতি ও লাইনের ময়লা পানি)',
      },
      {
        name: 'জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তর (DNCRP)',
        url: 'https://dncrp.portal.gov.bd',
        verifiedDate: '2026-11-20',
        note: 'হটলাইন ১৬১২১ (এলপিজি অতিরিক্ত মূল্য)',
      },
      {
        name: 'জাতীয় জরুরি সেবা ৯৯৯ (National Emergency Service)',
        url: 'https://nhd.gov.bd',
        verifiedDate: '2026-11-20',
        note: 'কল ৯৯৯ (গ্যাস বিস্ফোরণ বা বৈদ্যুতিক তারে অগ্নিকাণ্ড)',
      },
    ],
    relevantZones: [
      { nameBn: 'ধানমন্ডি', h3_index: '883cf10ca1fffff', ward: 'ওয়ার্ড ১৫' },
      { nameBn: 'বনানী', h3_index: '883cf13b25fffff', ward: 'ওয়ার্ড ১৯' },
      { nameBn: 'গুলশান ২', h3_index: '883cf13b27fffff', ward: 'ওয়ার্ড ১৮' },
      { nameBn: 'উত্তরা ৩', h3_index: '883cf10583fffff', ward: 'ওয়ার্ড ১' },
    ],
    summary:
      'ডিপিডিসি (১৬১১৬), ডেসকো (১৬১২০), তিতাস গ্যাস (১৬৪৯৬), ওয়াসা (১৬১৬২) এবং ভোক্তা অধিকারের (১৬১২১) যাচাইকৃত ফোন নম্বর এবং ট্র্যাকিং নম্বর সহ প্রাতিষ্ঠানিক অভিযোগের নিয়ম।',
  },
];

export function getGuideBySlug(slug: string): GuideMetadata | undefined {
  return EVERGREEN_GUIDES.find((g) => g.slug === slug);
}
