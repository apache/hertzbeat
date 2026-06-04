import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error -- the report script is exercised through its runtime ESM entrypoint.
import { collectUiLabCoverage, formatUiLabCoverageReport } from './ui-lab-coverage-report.mjs';

const tempDirs: string[] = [];

async function writeFixture(root: string, relativePath: string, text: string) {
  const fullPath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, text, 'utf8');
}

async function createRouteFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-ui-lab-coverage-'));
  tempDirs.push(root);
  await writeFixture(
    root,
    'lib/nav.ts',
    `export const routeCatalog = [
  { key: 'covered', href: '/covered', label: 'Covered', routeKind: 'primary', includeInRouteMatrix: true },
  { key: 'missing', href: '/missing', label: 'Missing', routeKind: 'primary', includeInRouteMatrix: true },
  { key: 'alias', href: '/old', label: 'Alias', routeKind: 'legacy-alias', redirectTo: '/covered', includeInRouteMatrix: true },
  { key: 'docs', href: 'https://example.test/docs', label: 'Docs', routeKind: 'primary', includeInRouteMatrix: false }
];\n`
  );
  return root;
}

describe('ui-lab coverage report', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('counts primary routes with @hertzbeat/ui ownership and allows redirect aliases without UI owners', async () => {
    const root = await createRouteFixture();
    await writeFixture(root, 'app/covered/page.tsx', "import { Covered } from '../../components/covered'; export default Covered;\n");
    await writeFixture(
      root,
      'components/covered.tsx',
      "import { HzButton } from '@hertzbeat/ui'; export function Covered() { return <HzButton data-covered-owner=\"hertzbeat-ui-button\">Open</HzButton>; }\n"
    );
    await writeFixture(root, 'app/missing/page.tsx', "export default function Missing() { return <main data-cold-panel=\"local\">Missing</main>; }\n");
    await writeFixture(root, 'app/old/page.tsx', "export default function Old() { return null; }\n");
    await writeFixture(root, 'lib/i18n-runtime-messages.ts', "export const text = 'ui-lab should not count as route ownership';\n");

    const coverage = collectUiLabCoverage(root);

    expect(coverage.summary).toMatchObject({
      catalogRoutes: 4,
      externalRoutes: 1,
      localPrimaryRoutes: 2,
      primaryWithUiOwner: 1,
      primaryMissingUiOwner: 1,
      primaryPartialColdOwner: 0,
      aliasLocalRoutes: 1,
      aliasWithoutUiOwner: 1
    });
    expect(coverage.primaryMissingUiOwner.map(route => route.href)).toEqual(['/missing']);
  });

  it('reports partial cold ownership separately from missing UI ownership', async () => {
    const root = await createRouteFixture();
    await writeFixture(root, 'app/covered/page.tsx', "import { Covered } from '../../components/covered'; export default Covered;\n");
    await writeFixture(
      root,
      'components/covered.tsx',
      "import { HzButton } from '@hertzbeat/ui'; export function Covered() { return <HzButton data-cold-legacy-filter=\"local\">Open</HzButton>; }\n"
    );
    await writeFixture(root, 'app/missing/page.tsx', "import { Missing } from '../../components/missing'; export default Missing;\n");
    await writeFixture(
      root,
      'components/missing.tsx',
      "import { HzPanelSurface } from '@hertzbeat/ui'; export function Missing() { return <HzPanelSurface>Now covered</HzPanelSurface>; }\n"
    );
    await writeFixture(root, 'app/old/page.tsx', "export default function Old() { return null; }\n");

    const coverage = collectUiLabCoverage(root);
    const report = formatUiLabCoverageReport(coverage);

    expect(coverage.summary.primaryMissingUiOwner).toBe(0);
    expect(coverage.summary.primaryPartialColdOwner).toBe(1);
    expect(coverage.primaryPartialColdOwner.map(route => route.href)).toEqual(['/covered']);
    expect(report).toContain('primaryMissingUiOwner=0');
    expect(report).toContain('Primary routes still mixing cold/local owners');
  });
});
