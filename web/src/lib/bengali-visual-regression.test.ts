/**
 * Halchal - Bengali Typography & Complex Conjunct Visual Regression Tests
 *
 * Catches font, glyph decomposition, and HarfBuzz/Rustybuzz shaping regressions
 * for complex Indic conjuncts:
 * - ক্ষ (ksha)
 * - শ্র (shra)
 * - ত্র (tra)
 * - স্ক (ska)
 * - গ্য (gya)
 *
 * Compares rendered OG image buffers against stored reference snapshots.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

function getFontPath(): string {
  const p1 = path.resolve(process.cwd(), 'public/fonts/NotoSansBengali.ttf');
  if (fs.existsSync(p1)) return p1;
  return path.resolve(process.cwd(), 'web/public/fonts/NotoSansBengali.ttf');
}

function getSnapshotPath(name: string): string {
  const p1 = path.resolve(process.cwd(), 'src/tests/fixtures/og-snapshots', `${name}.png`);
  if (fs.existsSync(p1)) return p1;
  return path.resolve(process.cwd(), 'web/src/tests/fixtures/og-snapshots', `${name}.png`);
}

function renderConjunctCard(text: string): Buffer {
  const fontPath = getFontPath();
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#070A0F"/>
    <rect x="60" y="60" width="1080" height="510" rx="20" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <text x="100" y="140" fill="#10B981" font-family="Noto Sans Bengali" font-weight="700" font-size="28">হালচাল ভিজ্যুয়াল রিগ্রেশন টেস্ট</text>
    <text x="100" y="280" fill="#F8FAFC" font-family="Noto Sans Bengali" font-weight="700" font-size="52">${text}</text>
    <text x="100" y="420" fill="#94A3B8" font-family="Noto Sans Bengali" font-size="24">HarfBuzz / Rustybuzz যুক্তাক্ষর শেপিং ভেরিফিকেশন</text>
  </svg>`;

  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [fontPath],
      defaultFontFamily: 'Noto Sans Bengali',
      loadSystemFonts: false,
    },
    fitTo: { mode: 'width', value: 1200 },
  });

  return Buffer.from(resvg.render().asPng());
}

describe('Bengali Complex Conjunct Visual Regression Tests', () => {
  const conjunctCases = [
    {
      id: 'ksha',
      conjunct: 'ক্ষ (ksha)',
      text: 'লক্ষ্মীপুর ও পরীক্ষা (ক্ষ)',
      description: 'Tests conjunct ক্ষ and ksha-ma ligature with matras',
    },
    {
      id: 'shra',
      conjunct: 'শ্র (shra)',
      text: 'শ্রীপুর ও পরিশ্রম (শ্র)',
      description: 'Tests conjunct শ্র with ee-kar and reph',
    },
    {
      id: 'tra',
      conjunct: 'ত্র (tra)',
      text: 'ত্রিশাল ও যাত্রাবাড়ী (ত্র)',
      description: 'Tests conjunct ত্র with i-kar and aa-kar',
    },
    {
      id: 'ska',
      conjunct: 'স্ক (ska)',
      text: 'ভাস্কর্য ও স্কুল (স্ক)',
      description: 'Tests conjunct স্ক with reph and u-kar',
    },
    {
      id: 'gya',
      conjunct: 'গ্য (gya)',
      text: 'ভাগ্য ও যোগ্য (গ্য)',
      description: 'Tests conjunct গ্য with ya-phala ligature',
    },
    {
      id: 'combined',
      conjunct: 'ক্ষ, শ্র, ত্র, স্ক, গ্য (Combined)',
      text: 'পরীক্ষা শ্রীপুর ত্রিশাল ভাস্কর্য ভাগ্য',
      description: 'Combined test sentence containing all 5 mandatory conjuncts in sequence',
    },
  ];

  for (const c of conjunctCases) {
    it(`renders "${c.conjunct}" and matches stored visual snapshot byte-for-byte`, () => {
      const renderedPng = renderConjunctCard(c.text);

      const snapshotFilePath = getSnapshotPath(c.id);
      expect(fs.existsSync(snapshotFilePath)).toBe(true);

      const expectedPng = fs.readFileSync(snapshotFilePath);

      // Byte-for-byte comparison against stored golden snapshot
      const isIdentical = Buffer.compare(renderedPng, expectedPng) === 0;
      expect(
        isIdentical,
        `Shaping regression detected for conjunct ${c.conjunct}! Rendered PNG does not match golden snapshot.`
      ).toBe(true);

      // Verify valid PNG dimensions (1200x630)
      expect(renderedPng.readUInt32BE(16)).toBe(1200);
      expect(renderedPng.readUInt32BE(20)).toBe(630);
    });
  }

  it('sensitively detects visual and byte divergence when a character is altered or decomposed', () => {
    // Deliberately altered text
    const renderedAltered = renderConjunctCard('পরীক্ষা শ্রীপুর ত্রিশাল ভাস্কর্য অন্য');
    const combinedSnapshot = fs.readFileSync(getSnapshotPath('combined'));

    // Assert that the test catches the divergence
    expect(Buffer.compare(renderedAltered, combinedSnapshot) === 0).toBe(false);
  });
});
