import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: [
      'src/lib/insights.test.ts',
      'src/lib/account-deletion.test.ts',
      'src/lib/seo.test.ts',
      'src/lib/areas.test.ts',
      'src/lib/aggregation.test.ts',
      'src/lib/seo-titles.test.ts',
      'src/lib/redirects.test.ts',
      'src/lib/quality-guardrails.test.ts',
      'src/lib/json-ld.test.ts',
      'src/lib/og-route.test.ts',
      'src/lib/bengali-visual-regression.test.ts',
      'src/lib/indexnow.test.ts',
    ],
  },
});
