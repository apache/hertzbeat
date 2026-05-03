import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error -- the report script is exercised through its runtime ESM entrypoint.
import { collectI18nReportHits } from './i18n-report.mjs';

const tempDirs: string[] = [];

async function writeFixture(root: string, relativePath: string, text: string) {
  const fullPath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, text, 'utf8');
}

describe('i18n report', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('scans app, components, lib, and scripts for CJK literals and literal fallback args', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-i18n-report-'));
    tempDirs.push(root);

    await writeFixture(root, 'app/page.tsx', "export const title = '欢迎';\n");
    await writeFixture(root, 'components/card.tsx', "export const label = t('menu.home', 'Dashboard');\n");
    await writeFixture(root, 'lib/view.ts', "export const title = t('monitor.app.mysql');\n");
    await writeFixture(root, 'scripts/seed.ts', "console.log('脚本');\n");

    await expect(collectI18nReportHits(root)).resolves.toEqual(
      expect.arrayContaining([
        expect.stringContaining('app/page.tsx:1: raw-cjk'),
        expect.stringContaining('components/card.tsx:1: literal-fallback'),
        expect.stringContaining('scripts/seed.ts:1: raw-cjk')
      ])
    );
  });

  it('ignores runtime locale resource files that intentionally carry localized copy', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-i18n-report-'));
    tempDirs.push(root);

    await writeFixture(root, 'lib/i18n-runtime-messages.ts', "export const messages = { greeting: '欢迎' };\n");
    await writeFixture(root, 'lib/alert-notice/view-model.ts', "export const copy = { title: '通知中心' };\n");
    await writeFixture(root, 'lib/other.ts', "export const title = '仍然违规';\n");

    await expect(collectI18nReportHits(root)).resolves.toEqual([
      expect.stringContaining('lib/other.ts:1: raw-cjk')
    ]);
  });
});
