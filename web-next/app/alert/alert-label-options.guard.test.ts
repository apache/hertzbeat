import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const alertPages = [
  'app/alert/silence/page.tsx',
  'app/alert/group/page.tsx',
  'app/alert/inhibit/page.tsx',
  'app/alert/notice/page.tsx'
];

describe('alert label search option wiring', () => {
  it('loads shared label options for alert authoring routes that expose searchable label fields', () => {
    for (const pagePath of alertPages) {
      const source = readFileSync(resolve(process.cwd(), pagePath), 'utf8');
      expect(source, pagePath).toContain('loadAlertLabelOptions');
      expect(source, pagePath).toContain('labelOptions');
    }
  });
});
