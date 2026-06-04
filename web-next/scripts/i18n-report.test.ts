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

function cjk(...codePoints: number[]) {
  return String.fromCodePoint(...codePoints);
}

describe('i18n report', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('scans app, components, lib, and scripts for CJK literals and literal fallback args', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-i18n-report-'));
    tempDirs.push(root);

    await writeFixture(root, 'app/page.tsx', `export const title = '${cjk(0x6b22, 0x8fce)}';\n`);
    await writeFixture(root, 'components/card.tsx', "export const label = t('menu.home', 'Dashboard');\n");
    await writeFixture(root, 'lib/view.ts', "export const title = t('monitor.app.mysql');\n");
    await writeFixture(root, 'scripts/seed.ts', `console.log('${cjk(0x811a, 0x672c)}');\n`);

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

    await writeFixture(
      root,
      'lib/i18n-runtime-messages.ts',
      `export type Messages = Record<string, string>;
export const SUPPLEMENTAL_MESSAGES = {
  'en-US': {
    greeting: 'Hello',
  },
  'zh-CN': {
    greeting: '${cjk(0x6b22, 0x8fce)}',
  },
};
`
    );
    await writeFixture(root, 'lib/alert-notice/view-model.ts', `export const copy = { title: '${cjk(0x901a, 0x77e5, 0x4e2d, 0x5fc3)}' };\n`);
    await writeFixture(root, 'lib/other.ts', `export const title = '${cjk(0x4ecd, 0x7136, 0x8fdd, 0x89c4)}';\n`);

    await expect(collectI18nReportHits(root)).resolves.toEqual([
      expect.stringContaining('lib/other.ts:1: raw-cjk')
    ]);
  });

  it('reports static t() keys that are missing from the runtime English or Chinese bundle', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-i18n-report-'));
    tempDirs.push(root);

    await writeFixture(
      root,
      'lib/i18n-runtime-messages.ts',
      `export type Messages = Record<string, string>;
const EN_US_PRODUCTION_STATIC_MESSAGES: Messages = {
  'common.save': 'Save',
};
const ZH_CN_PRODUCTION_STATIC_MESSAGES: Messages = {
  'common.save': '${cjk(0x4fdd, 0x5b58)}',
};
export const SUPPLEMENTAL_MESSAGES = {
  'en-US': {
    ...EN_US_PRODUCTION_STATIC_MESSAGES,
  },
  'zh-CN': {
    ...ZH_CN_PRODUCTION_STATIC_MESSAGES,
  },
};
`
    );
    await writeFixture(root, 'app/page.tsx', "export const labels = [t('common.save'), t('missing.route.title')];\n");

    await expect(collectI18nReportHits(root)).resolves.toEqual(
      expect.arrayContaining([
        expect.stringContaining('app/page.tsx:1: missing-i18n-key(en-US,static-t): missing.route.title'),
        expect.stringContaining('app/page.tsx:1: missing-i18n-key(zh-CN,static-t): missing.route.title')
      ])
    );
  });

  it('reports variable translation key properties and translation-key maps without flagging business keys', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-i18n-report-'));
    tempDirs.push(root);

    await writeFixture(
      root,
      'lib/i18n-runtime-messages.ts',
      `export type Messages = Record<string, string>;
export const SUPPLEMENTAL_MESSAGES = {
  'en-US': {
    'menu.home': 'Home',
    'common.ready': 'Ready',
  },
  'zh-CN': {
    'menu.home': '${cjk(0x9996, 0x9875)}',
    'common.ready': '${cjk(0x5c31, 0x7eea)}',
  },
};
`
    );
    await writeFixture(
      root,
      'lib/nav.ts',
      `export const routes = [
  { routePairKey: 'not-a-translation-key', labelKey: 'menu.home' },
  { labelKey: 'menu.missing' },
];
export const STATUS_LABEL_KEYS = {
  ready: 'common.ready',
  empty: 'common.empty-missing',
};
`
    );

    await expect(collectI18nReportHits(root)).resolves.toEqual(
      expect.arrayContaining([
        expect.stringContaining('lib/nav.ts:3: missing-i18n-key(en-US,translation-key-property): menu.missing'),
        expect.stringContaining('lib/nav.ts:3: missing-i18n-key(zh-CN,translation-key-property): menu.missing'),
        expect.stringContaining('lib/nav.ts:6: missing-i18n-key(en-US,translation-key-map): common.empty-missing'),
        expect.stringContaining('lib/nav.ts:6: missing-i18n-key(zh-CN,translation-key-map): common.empty-missing')
      ])
    );
  });
});
