/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { createNoticeReceiverDraft } from '../model/notice-receiver-model';
import { canSubmitNoticeReceiver, noticeReceiverReceiptAction } from './notice-receiver-action-admission';
import { persistedNoticeReceiver } from './notice-receiver-controller-test-fixtures';

const createOnly = { canCreate: true, canEdit: false, canTest: false, canDelete: false };
const editOnly = { canCreate: false, canEdit: true, canTest: false, canDelete: false };

describe('notice receiver action admission', () => {
  it('selects create or edit submission from draft identity', () => {
    const createDraft = createNoticeReceiverDraft();
    const editDraft = { ...createDraft, id: 7 };

    expect(canSubmitNoticeReceiver(createOnly, createDraft)).toBe(true);
    expect(canSubmitNoticeReceiver(createOnly, editDraft)).toBe(false);
    expect(canSubmitNoticeReceiver(editOnly, createDraft)).toBe(false);
    expect(canSubmitNoticeReceiver(editOnly, editDraft)).toBe(true);
  });

  it('maps retained receipt evidence to its exact action', () => {
    const draft = createNoticeReceiverDraft();
    expect(noticeReceiverReceiptAction({ kind: 'save', phase: 'write', draft })).toBe('create');
    expect(noticeReceiverReceiptAction({ kind: 'save', phase: 'proof', draft: { ...draft, id: 7 } })).toBe('edit');
    expect(
      noticeReceiverReceiptAction({
        kind: 'test',
        phase: 'delivery-uncertain',
        draft,
        failure: 'unavailable'
      })
    ).toBe('test');
    expect(noticeReceiverReceiptAction({ kind: 'delete', phase: 'projection', record: persistedNoticeReceiver })).toBe(
      'delete'
    );
  });
});
