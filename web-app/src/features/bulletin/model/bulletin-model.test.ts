/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  buildBulletinPayload,
  bulletinPageIndexCorrection,
  bulletinMonitorMatchesSearch,
  formatBulletinTime,
  readBulletinQuery,
  validateBulletinDraft,
  writeBulletinQuery
} from './bulletin-model';

describe('bulletin model', () => {
  it('derives page correction only from matching authoritative page evidence', () => {
    const query = { search: 'ops', pageIndex: 4, pageSize: 15 };

    expect(
      bulletinPageIndexCorrection(query, {
        content: [],
        totalElements: 16,
        totalPages: 2,
        number: 4,
        size: 15
      })
    ).toBe(1);
    expect(
      bulletinPageIndexCorrection(query, {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 4,
        size: 15
      })
    ).toBe(0);
    expect(
      bulletinPageIndexCorrection(query, {
        content: [],
        totalElements: 16,
        totalPages: 2,
        number: 3,
        size: 15
      })
    ).toBeUndefined();
    expect(
      bulletinPageIndexCorrection(query, {
        content: [],
        totalElements: 16,
        totalPages: 3,
        number: 4,
        size: 15
      })
    ).toBeUndefined();
    expect(
      bulletinPageIndexCorrection(query, {
        content: [],
        totalElements: 16,
        totalPages: 2,
        number: 4,
        size: 8
      })
    ).toBeUndefined();
    expect(
      bulletinPageIndexCorrection(
        { ...query, pageIndex: 0 },
        { content: [], totalElements: 0, totalPages: 0, number: 0, size: 15 }
      )
    ).toBeUndefined();
  });

  it('canonicalizes search and pagination query state', () => {
    expect(readBulletinQuery(new URLSearchParams('search= api &pageIndex=2&pageSize=15'))).toEqual({
      search: 'api',
      pageIndex: 2,
      pageSize: 15
    });
    expect(writeBulletinQuery({ search: '', pageIndex: 0, pageSize: 8 }).toString()).toBe('pageIndex=0&pageSize=8');
  });

  it('rejects monitor/app mismatches and invalid metric fields', () => {
    const draft = { name: 'Ops', app: 'website', monitorIds: [1, 2], fields: { responseTime: ['duration'] } };
    expect(
      validateBulletinDraft(
        draft,
        [monitor(1, 'one', 'website'), monitor(2, 'two', 'mysql')],
        [{ name: 'responseTime', fields: ['duration'] }]
      )
    ).toContain('monitorIds');
    expect(
      validateBulletinDraft(draft, [monitor(1, 'one', 'website')], [{ name: 'availability', fields: ['status'] }])
    ).toContain('fields');
    expect(
      validateBulletinDraft(
        { ...draft, monitorIds: [99] },
        [monitor(1, 'one', 'website')],
        [{ name: 'responseTime', fields: ['duration'] }]
      )
    ).toContain('monitorIds');
    expect(
      validateBulletinDraft(
        { ...draft, fields: { responseTime: ['stale'] } },
        [monitor(1, 'one', 'website'), monitor(2, 'two', 'website')],
        [{ name: 'responseTime', fields: ['duration'] }]
      )
    ).toContain('fields');
  });

  it('builds a canonical payload without audit fields', () => {
    expect(
      buildBulletinPayload({
        id: 7,
        name: ' Ops ',
        app: 'website',
        monitorIds: [2, 1, 2],
        fields: { responseTime: ['duration', 'duration'] }
      })
    ).toEqual({ id: 7, name: 'Ops', app: 'website', monitorIds: [1, 2], fields: { responseTime: ['duration'] } });
  });

  it('cleans field values without alphabetizing operator hierarchy order', () => {
    const payload = buildBulletinPayload({
      name: ' Ops ',
      app: ' website ',
      monitorIds: [1],
      fields: {
        ' zMetric ': [' zField ', 'aField', 'zField', ' '],
        aMetric: ['zField', ' aField ', 'zField']
      }
    });

    expect(Object.entries(payload.fields)).toEqual([
      ['zMetric', ['zField', 'aField']],
      ['aMetric', ['zField', 'aField']]
    ]);
  });

  it('matches monitor choices by name, label key, or label value', () => {
    const monitor = {
      id: 1,
      name: 'checkout-api',
      app: 'website',
      labels: { environment: 'production', team: 'payments' }
    };

    expect(bulletinMonitorMatchesSearch(monitor, 'CHECKOUT')).toBe(true);
    expect(bulletinMonitorMatchesSearch(monitor, 'environment')).toBe(true);
    expect(bulletinMonitorMatchesSearch(monitor, 'PAYMENTS')).toBe(true);
    expect(bulletinMonitorMatchesSearch(monitor, 'staging')).toBe(false);
    expect(bulletinMonitorMatchesSearch(monitor, '  ')).toBe(true);
  });

  it('formats valid timestamps and safely hides empty or invalid values', () => {
    expect(formatBulletinTime(null, 'en-US')).toBe('—');
    expect(formatBulletinTime('not-a-date', 'en-US')).toBe('—');
    expect(formatBulletinTime('2026-07-17T16:41:46Z', 'en-US')).not.toContain('T16:41:46');
  });
});

function monitor(id: number, name: string, app: string) {
  return { id, name, app, labels: {} };
}
