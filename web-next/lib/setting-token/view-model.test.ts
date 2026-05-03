import { describe, expect, it, vi } from 'vitest';
import { buildTokenEmptyState, buildTokenExpirationOptions, buildTokenFacts, buildTokenMetrics, buildTokenRows, isExpired } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const fixedNow = new Date('2026-04-10T12:00:00Z').getTime();
const t = createTranslatorMock();

describe('setting token view model', () => {
  it('detects expired tokens', () => {
    expect(isExpired({ expireTime: '2026-04-09T12:00:00Z' } as any, fixedNow)).toBe(true);
    expect(isExpired({ expireTime: '2026-04-11T12:00:00Z' } as any, fixedNow)).toBe(false);
  });

  it('builds token metrics', () => {
    expect(
      buildTokenMetrics(
        [
          { expireTime: '2026-04-11T12:00:00Z' },
          { expireTime: '2026-04-09T12:00:00Z' }
        ] as any,
        fixedNow
      )
    ).toEqual([
      { label: 'total tokens', value: '2' },
      { label: 'active tokens', value: '1', tone: 'success' },
      { label: 'expired tokens', value: '1', tone: 'warning' }
    ]);
  });

  it('builds token rows', () => {
    expect(
      buildTokenRows(
        [
          {
            name: 'otlp-token',
            tokenMask: 'hb_xxx',
            creator: 'admin',
            expireTime: '2026-04-11T12:00:00Z'
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00',
        fixedNow
      )
    ).toEqual([
      {
        title: 'otlp-token',
        copy: 'hb_xxx · creator admin',
        meta: 'active · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('builds token facts from lifecycle counts', () => {
    expect(
      buildTokenFacts(
        [
          { expireTime: '2026-04-11T12:00:00Z' },
          { expireTime: '2026-04-09T12:00:00Z' }
        ] as any,
        t,
        fixedNow
      )
    ).toEqual([
      { label: 'Workspace', value: 'setting/settings/token' },
      { label: 'Total', value: '2' },
      { label: 'Active', value: '1' },
      { label: 'Expired', value: '1' }
    ]);
  });

  it('builds expiration options and empty state copy', () => {
    expect(buildTokenExpirationOptions(t)).toEqual([
      { value: '-1', label: 'Never expires' },
      { value: '604800', label: '7 days' },
      { value: '2592000', label: '30 days' },
      { value: '7776000', label: '90 days' },
      { value: '15552000', label: '180 days' },
      { value: '31536000', label: '365 days' }
    ]);

    expect(buildTokenEmptyState(t)).toEqual({
      title: 'No tokens yet',
      copy: 'Generate a token first.'
    });
  });
});
