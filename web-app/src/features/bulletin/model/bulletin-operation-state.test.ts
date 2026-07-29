/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { createBulletinOutcomeNotice, type BulletinRecovery } from './bulletin-operation-state';

describe('Bulletin operation outcome', () => {
  it.each([
    [
      'create',
      {
        stage: 'create-proof',
        draft: draft(),
        beforeIds: [4, 2],
        failure: 'unavailable'
      },
      { kind: 'proof-stopped', operation: 'save', stage: 'create-proof', draft: { name: 'Operations' } }
    ],
    [
      'update',
      {
        stage: 'update-proof',
        draft: { ...draft(), id: 7 },
        failure: 'invalid'
      },
      { kind: 'proof-stopped', operation: 'save', stage: 'update-proof', draft: { id: 7, name: 'Operations' } }
    ],
    [
      'single delete',
      { stage: 'delete-proof', ids: [7], batch: false, failure: 'error' },
      { kind: 'proof-stopped', operation: 'delete', stage: 'delete-proof', ids: [7], batch: false, count: 1 }
    ],
    [
      'batch delete',
      { stage: 'delete-proof', ids: [7, 9], batch: true, failure: 'error' },
      { kind: 'proof-stopped', operation: 'delete', stage: 'delete-proof', ids: [7, 9], batch: true, count: 2 }
    ]
  ] as const)('retains immutable submitted evidence for %s', (_label, recovery, expected) => {
    const notice = createBulletinOutcomeNotice(recovery as BulletinRecovery);

    expect(notice).toMatchObject(expected);
    expect(Object.isFrozen(notice)).toBe(true);
    if ('draft' in notice) {
      expect(Object.isFrozen(notice.draft)).toBe(true);
      expect(Object.isFrozen(notice.draft.monitorIds)).toBe(true);
      expect(Object.isFrozen(notice.draft.fields.responseTime)).toBe(true);
    }
    if ('ids' in notice) {
      expect(Object.isFrozen(notice.ids)).toBe(true);
      expect(notice).not.toHaveProperty('confirmedDeletedIds');
    }
  });

  it('describes projection recovery as a confirmed mutation with a stale list', () => {
    expect(
      createBulletinOutcomeNotice({
        stage: 'projection',
        operation: 'save',
        failure: 'unavailable'
      })
    ).toEqual({
      kind: 'projection-stopped',
      operation: 'save',
      mutation: 'confirmed',
      projection: 'stale'
    });
  });

  it('keeps a detached snapshot when the live submitted draft changes later', () => {
    const submitted = draft();
    const notice = createBulletinOutcomeNotice({
      stage: 'create-proof',
      draft: submitted,
      beforeIds: [2],
      failure: 'unavailable'
    });

    submitted.name = 'Changed after retirement';
    submitted.monitorIds.push(9);
    submitted.fields.responseTime?.push('status');

    expect(notice).toMatchObject({
      kind: 'proof-stopped',
      stage: 'create-proof',
      draft: {
        name: 'Operations',
        monitorIds: [1],
        fields: { responseTime: ['duration'] }
      },
      beforeIds: [2]
    });
  });
});

function draft() {
  return {
    name: 'Operations',
    app: 'website',
    monitorIds: [1],
    fields: { responseTime: ['duration'] }
  };
}
