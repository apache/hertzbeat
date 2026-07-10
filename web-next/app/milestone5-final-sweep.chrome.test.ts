import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, resolve, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildProductDesignValidationMatrix } from '../scripts/product-design-validation-matrix.mjs';

const auditedRoots = [
  'components/pages',
  'components/observability',
  'components/overview',
  'components/log-manage',
  'components/workbench',
  'app/overview',
  'app/log',
  'app/trace',
  'app/ingestion',
  'app/dashboard',
  'app/monitors',
  'app/entities',
  'app/topology',
  'app/explorer',
  'app/bulletin',
  'app/alert',
  'app/setting',
  'app/passport',
  'app/login',
  'app/status',
  'app/exception',
  'app/actions',
  'app/incidents'
] as const;

const residuePatterns = [
  'rounded-[18px]',
  'rounded-[16px]',
  'rounded-[14px]',
  'rounded-[12px]',
  'border-white/10',
  'border-white/8',
  'border-white/6',
  'bg-black/20',
  'bg-black/10',
  'bg-white/[0.02]',
  'bg-white/[0.03]',
  'bg-white/[0.04]',
  'bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(2,6,23,0.52))]',
  'text-white/86',
  'text-white/78',
  'text-white/72',
  'text-white/62',
  'text-white/52',
  'text-white/42',
  'text-white/38',
  'text-white/30',
  'text-white/28',
  'text-[#f3eee6]',
  'text-[#e7dfd1]'
] as const;

function collectFiles(root: string, matcher: (pathName: string) => boolean): string[] {
  const absoluteRoot = resolve(process.cwd(), root);
  const results: string[] = [];

  function walk(currentPath: string) {
    const entry = statSync(currentPath);
    if (entry.isDirectory()) {
      for (const child of readdirSync(currentPath)) {
        walk(resolve(currentPath, child));
      }
      return;
    }

    if (matcher(currentPath)) {
      results.push(currentPath);
    }
  }

  walk(absoluteRoot);
  return results.sort();
}

describe('Milestone 5 final parity sweep', () => {
  it('keeps the migrated page families free of the tracked legacy white-on-black and large-radius residue', () => {
    const sourceFiles = auditedRoots.flatMap(root =>
      collectFiles(root, pathName => /\.(ts|tsx)$/.test(pathName) && !/\.test\.tsx?$/.test(pathName))
    );

    expect(sourceFiles.length).toBeGreaterThan(100);

    const violations = sourceFiles.flatMap(filePath => {
      const source = readFileSync(filePath, 'utf8');
      const relativePath = relative(process.cwd(), filePath);
      return residuePatterns.filter(pattern => source.includes(pattern)).map(pattern => `${relativePath} -> ${pattern}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps the current route and adjacent-test inventory machine-verifiable', () => {
    const pageCount = collectFiles('app', pathName => basename(pathName) === 'page.tsx').length;
    const matrix = buildProductDesignValidationMatrix(process.cwd(), { freshBrowserAudit: false });

    expect(matrix.routeCount).toBe(pageCount);
    expect(matrix.missingRouteTests).toEqual([]);
    expect(matrix.uncategorizedRoutes).toEqual([]);
    expect(matrix.contractValid).toBe(true);
  });
});
