/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  buildBulletinPayload, formatBulletinTime, readBulletinQuery, validateBulletinDraft, writeBulletinQuery
} from './bulletin-model';

describe('bulletin model', () => {
  it('canonicalizes search and pagination query state', () => {
    expect(readBulletinQuery(new URLSearchParams('search= api &pageIndex=2&pageSize=15')))
      .toEqual({ search: 'api', pageIndex: 2, pageSize: 15 });
    expect(writeBulletinQuery({ search: '', pageIndex: 0, pageSize: 8 }).toString())
      .toBe('pageIndex=0&pageSize=8');
  });

  it('rejects monitor/app mismatches and invalid metric fields', () => {
    const draft = { name: 'Ops', app: 'website', monitorIds: [1, 2], fields: { responseTime: ['duration'] } };
    expect(validateBulletinDraft(draft, [
      { id: 1, name: 'one', app: 'website' }, { id: 2, name: 'two', app: 'mysql' }
    ], [{ name: 'responseTime', fields: ['duration'] }])).toContain('monitorIds');
    expect(validateBulletinDraft(draft, [{ id: 1, name: 'one', app: 'website' }], [{ name: 'availability', fields: ['status'] }]))
      .toContain('fields');
    expect(validateBulletinDraft({ ...draft, monitorIds: [99] }, [{ id: 1, name: 'one', app: 'website' }], [{ name: 'responseTime', fields: ['duration'] }]))
      .toContain('monitorIds');
    expect(validateBulletinDraft({ ...draft, fields: { responseTime: ['stale'] } },
      [{ id: 1, name: 'one', app: 'website' }, { id: 2, name: 'two', app: 'website' }],
      [{ name: 'responseTime', fields: ['duration'] }])).toContain('fields');
  });

  it('builds a canonical payload without audit fields', () => {
    expect(buildBulletinPayload({
      id: 7, name: ' Ops ', app: 'website', monitorIds: [2, 1, 2], fields: { responseTime: ['duration', 'duration'] }
    })).toEqual({ id: 7, name: 'Ops', app: 'website', monitorIds: [1, 2], fields: { responseTime: ['duration'] } });
  });

  it('formats valid timestamps and safely hides empty or invalid values', () => {
    expect(formatBulletinTime(null, 'en-US')).toBe('—');
    expect(formatBulletinTime('not-a-date', 'en-US')).toBe('—');
    expect(formatBulletinTime('2026-07-17T16:41:46Z', 'en-US')).not.toContain('T16:41:46');
  });
});
