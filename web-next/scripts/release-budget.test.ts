import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  collectReleaseJsAssets,
  evaluateReleaseBudget,
  formatBudgetBytes,
  parseBudgetBytes
} from './release-budget.mjs';

describe('release budget gate', () => {
  it('collects built Next.js static JavaScript assets without counting non-js files', () => {
    const currentWorkingDirectory = process.cwd();
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'hertzbeat-release-budget-'));
    try {
      const chunksDir = path.join(tempRoot, '.next/static/chunks/app');
      mkdirSync(chunksDir, { recursive: true });
      writeFileSync(path.join(chunksDir, 'overview.js'), 'x'.repeat(13));
      writeFileSync(path.join(chunksDir, 'overview.css'), 'x'.repeat(99));

      process.chdir(tempRoot);

      expect(collectReleaseJsAssets()).toEqual([
        {
          path: 'static/chunks/app/overview.js',
          bytes: 13
        }
      ]);
    } finally {
      process.chdir(currentWorkingDirectory);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('evaluates total release chunk size against a configurable budget', () => {
    const result = evaluateReleaseBudget(
      [
        { path: 'static/chunks/a.js', bytes: 6 },
        { path: 'static/chunks/b.js', bytes: 5 }
      ],
      10,
    );

    expect(result).toMatchObject({
      totalBytes: 11,
      maxBytes: 10,
      passed: false
    });
    expect(result.largestEntries.map(entry => entry.path)).toEqual(['static/chunks/a.js', 'static/chunks/b.js']);
  });

  it('parses and formats release budget values for CI diagnostics', () => {
    expect(parseBudgetBytes('2048')).toBe(2048);
    expect(formatBudgetBytes(2048)).toBe('2.00 KiB');
    expect(() => parseBudgetBytes('0')).toThrow('Invalid HERTZBEAT_WEB_NEXT_BUNDLE_BUDGET_BYTES');
  });
});
