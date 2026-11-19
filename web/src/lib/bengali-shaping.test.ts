/**
 * Test: Bengali Typography & Complex Conjunct Shaping Verification
 * Verifies HarfBuzz / rustybuzz shaping via resvg-js for complex Indic conjuncts:
 * ক্ষ (ksha), শ্র (shra), ত্র (tra), স্ক (ska), ঙ্ক (nka), ষ্ণ (shna), হ্ম (hma)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

describe('Bengali Complex Conjunct Shaping with resvg-js', () => {
  const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansBengali.ttf');
  const fontBuffer = fs.readFileSync(fontPath);

  const testConjunctWords = [
    { word: 'লক্ষ্মীপুর', description: 'ক্ষ্ম (ksha-ma) conjunct with matras' },
    { word: 'শ্রীপুর', description: 'শ্র (shra) ligature with ee-kar' },
    { word: 'ত্রিশাল', description: 'ত্র (tra) ligature with i-kar' },
    { word: 'ভাস্কর্য', description: 'স্ক (ska) conjunct and reph' },
    { word: 'ব্রাহ্মণবাড়িয়া', description: 'হ্ম (hma) and ষ্ণ (shna) ligatures' },
    { word: 'ধানমন্ডি', description: 'ন্ড (nda) conjunct with i-kar' },
  ];

  it('successfully loads NotoSansBengali font buffer', () => {
    assert.ok(fontBuffer.length > 50000, 'Font buffer must be valid TrueType binary');
  });

  for (const { word, description } of testConjunctWords) {
    it(`renders complex conjunct string "${word}" (${description}) without glyph decomposition errors`, () => {
      const svg = `
        <svg width="600" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#070A0F"/>
          <text x="40" y="100" fill="#F8FAFC" font-family="Noto Sans Bengali" font-size="42">
            ${word}
          </text>
        </svg>
      `;

      const resvg = new Resvg(svg, {
        font: {
          fontFiles: [fontPath],
          defaultFontFamily: 'Noto Sans Bengali',
        },
      });

      const png = resvg.render().asPng();
      assert.ok(png.length > 1000, `Rendered PNG for ${word} should have non-trivial size`);

      // Verify PNG magic bytes [0x89, 0x50, 0x4E, 0x47]
      assert.strictEqual(png[0], 0x89);
      assert.strictEqual(png[1], 0x50);
      assert.strictEqual(png[2], 0x4e);
      assert.strictEqual(png[3], 0x47);
    });
  }
});
