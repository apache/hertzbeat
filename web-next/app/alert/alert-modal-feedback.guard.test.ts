import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const alertPageFiles = [
  'app/alert/silence/alert-silence-page.tsx',
  'app/alert/group/alert-group-page.tsx',
  'app/alert/inhibit/alert-inhibit-page.tsx',
  'app/alert/notice/alert-notice-page.tsx',
  'app/alert/setting/alert-setting-page.tsx'
];

describe('alert modal feedback guard', () => {
  it('uses the shared cold confirm dialog instead of browser-native confirm on alert management pages', () => {
    for (const file of alertPageFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');

      expect(source, file).not.toContain('window.confirm');
      expect(source, file).not.toContain('confirm(');
      expect(source, file).not.toContain('window.alert');
      expect(source, file).not.toContain('alert(');
      expect(source, file).toContain('ColdConfirmDialog');
      expect(source, file).toContain('data-alert-delete-confirm');
    }
  });
});
