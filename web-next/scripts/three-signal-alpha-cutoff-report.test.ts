import { describe, expect, it } from 'vitest';
// @ts-expect-error -- the report script is exercised through its runtime ESM entrypoint.
import {
  THREE_SIGNAL_ALPHA_CUTOFF_ITEMS,
  evaluateThreeSignalAlphaCutoff,
  formatThreeSignalAlphaCutoffReport,
  readThreeSignalAlphaCutoffFiles,
  verifyThreeSignalAlphaCutoff
} from './three-signal-alpha-cutoff-report.mjs';

describe('three-signal alpha cutoff report', () => {
  it('passes every source-backed alpha cutoff evidence item in the current repo', () => {
    const results = verifyThreeSignalAlphaCutoff();

    expect(results.every(result => result.passed)).toBe(true);
    expect(results.map(result => result.key)).toEqual([
      'alpha-cutoff-doc',
      'live-proof-default',
      'service-overview-evidence',
      'operation-drilldown-evidence',
      'runtime-dimension-boundary'
    ]);
    expect(formatThreeSignalAlphaCutoffReport(results)).toContain('ok operation-drilldown-evidence');
  });

  it('reports the exact missing evidence key when operation drilldown live proof is removed', () => {
    const files = readThreeSignalAlphaCutoffFiles();
    const withoutOperationProof = {
      ...files,
      liveBrowserSmoke: files.liveBrowserSmoke.replace('data-dashboard-operation-drilldown-action="save"', '')
    };
    const results = evaluateThreeSignalAlphaCutoff(withoutOperationProof);

    expect(THREE_SIGNAL_ALPHA_CUTOFF_ITEMS).toHaveLength(5);
    expect(results.find(result => result.key === 'operation-drilldown-evidence')?.passed).toBe(false);
    expect(() => verifyThreeSignalAlphaCutoff(withoutOperationProof)).toThrow('operation-drilldown-evidence');
  });
});
