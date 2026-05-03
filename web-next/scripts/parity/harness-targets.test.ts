import manifest from '../../lib/parity/route-manifest.json';
import { describe, expect, it } from 'vitest';
import { resolveParityTargets } from './harness-targets.mjs';

describe('parity harness targets', () => {
  it('resolves every manifest-owned route pair for milestone 2 without hardcoded route lists', () => {
    const targets = resolveParityTargets(manifest, { milestone: 2 });

    expect(targets.map(target => `${target.family.key}/${target.routePair.key}`)).toEqual(
      expect.arrayContaining([
        'three-signal-desk/overview-desk',
        'three-signal-desk/log-manage-desk',
        'three-signal-desk/trace-manage-desk',
        'three-signal-desk/otlp-center-desk',
        'three-signal-desk/otlp-metrics-console',
        'log-compatibility-family/log-stream-compat',
        'log-compatibility-family/log-integration-root-compat',
        'log-compatibility-family/log-integration-compat',
      ])
    );
    expect(targets).toHaveLength(8);
    expect(targets.map(target => target.routePair.key)).not.toContain('events-alias');
  });

  it('rejects a family selection that does not belong to the requested milestone', () => {
    expect(() => resolveParityTargets(manifest, { milestone: 2, familyKey: 'monitor-family' })).toThrow(
      'does not belong to milestone 2'
    );
  });

  it('keeps the default fallback on the first route pair of the earliest milestone', () => {
    expect(resolveParityTargets(manifest, {})).toMatchObject([
      {
        family: {
          key: 'shared-parity-foundation',
          milestone: 1
        },
        routePair: {
          key: 'passport-login-shell'
        }
      }
    ]);
  });
});
