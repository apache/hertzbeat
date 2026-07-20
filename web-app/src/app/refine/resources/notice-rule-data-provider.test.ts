/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  deleteRule: vi.fn(),
  loadAll: vi.fn(),
  loadOne: vi.fn(),
  loadPage: vi.fn(),
  save: vi.fn()
}));

vi.mock('@/features/alert/notice-rule/api/notice-rule-api', () => ({
  deleteNoticeRule: api.deleteRule,
  loadAllNoticeRulesByName: api.loadAll,
  loadNoticeRule: api.loadOne,
  loadNoticeRules: api.loadPage,
  saveNoticeRule: api.save
}));

import {
  NoticeRuleContractError,
  NoticeRuleRequestFailure
} from '@/features/alert/notice-rule/model/notice-rule-failure';
import { noticeRuleDataProvider } from './notice-rule-data-provider';
import {
  createNoticeRuleDraft,
  type NoticeRuleMutationVariables
} from '@/features/alert/notice-rule/model/notice-rule-model';

const receiver = { id: 11, name: 'Email', type: 1 as const };
const template = { id: 21, name: 'Mail', type: 1 as const, preset: false, content: '${content}' };
const draft = { ...createNoticeRuleDraft(), name: 'Proof', receiverIds: [11], templateId: 21 };
const rule = {
  id: 31,
  name: 'Proof',
  receiverId: [11],
  receiverName: ['Email'],
  templateId: 21,
  templateName: 'Mail',
  enable: true,
  filterAll: true,
  labels: {},
  days: [1, 2, 3, 4, 5, 6, 7],
  periodStart: null,
  periodEnd: null
};
const variables: NoticeRuleMutationVariables = { draft, receivers: [receiver], templates: [template] };

describe('notice rule data provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.save.mockResolvedValue(undefined);
  });

  it('proves create with exactly one new canonical ID from complete before and after scans', async () => {
    api.loadAll.mockResolvedValueOnce([]).mockResolvedValueOnce([rule]);
    const response = await noticeRuleDataProvider.create({ resource: 'notice-rules', variables });
    expect(response.data).toEqual(rule);
    expect(api.loadAll).toHaveBeenNthCalledWith(1, 'Proof');
    expect(api.loadAll).toHaveBeenNthCalledWith(2, 'Proof');
  });

  it('rejects ambiguous create evidence without treating a matching name as identity', async () => {
    api.loadAll.mockResolvedValueOnce([]).mockResolvedValueOnce([rule, { ...rule, id: 32 }]);
    await expect(noticeRuleDataProvider.create({ resource: 'notice-rules', variables })).rejects.toMatchObject({
      code: 'NOTICE_RULE_CREATE_NOT_CONVERGED'
    });
  });

  it('rejects stale, duplicate, malformed, and template-incompatible dependencies before transport', async () => {
    const cases: unknown[] = [
      { ...variables, receivers: [{ ...receiver, extra: 'not-public' }] },
      { ...variables, templates: [{ ...template, extra: 'not-public' }] },
      { ...variables, templates: [{ ...template, preset: true }] },
      { ...variables, templates: [{ ...template, id: null }] },
      { ...variables, draft: { ...draft, receiverIds: [11, 11] } },
      { ...variables, draft: { ...draft, receiverIds: [999] } },
      { ...variables, draft: { ...draft, templateId: 999 } },
      { ...variables, receivers: [{ ...receiver, type: 2 }] }
    ];
    for (const invalid of cases) {
      await expect(
        noticeRuleDataProvider.create({ resource: 'notice-rules', variables: invalid })
      ).rejects.toMatchObject({ code: 'NOTICE_RULE_VARIABLES_INVALID' });
    }
    expect(api.loadAll).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });

  it('requires update detail convergence and delete detail missing evidence', async () => {
    const updateVariables = { ...variables, draft: { ...draft, id: 31 } };
    api.loadOne.mockResolvedValueOnce({ ...rule, enable: false });
    await expect(
      noticeRuleDataProvider.update({ resource: 'notice-rules', id: 31, variables: updateVariables })
    ).rejects.toMatchObject({ code: 'NOTICE_RULE_UPDATE_NOT_CONVERGED' });

    api.loadOne.mockResolvedValueOnce(rule).mockRejectedValueOnce(new NoticeRuleRequestFailure('missing'));
    await expect(noticeRuleDataProvider.deleteOne({ resource: 'notice-rules', id: 31 })).resolves.toEqual({
      data: rule
    });
  });

  it('preserves explicit domain evidence instead of rebuilding it from HTTP-shaped fields', async () => {
    const unavailable = new NoticeRuleRequestFailure('unavailable');
    api.loadPage.mockRejectedValueOnce(unavailable);
    await expect(
      noticeRuleDataProvider.getList({ resource: 'notice-rules', pagination: { currentPage: 1, pageSize: 8 } })
    ).rejects.toBe(unavailable);

    const missing = new NoticeRuleRequestFailure('missing');
    api.loadOne.mockRejectedValueOnce(missing);
    await expect(noticeRuleDataProvider.getOne({ resource: 'notice-rules', id: 31 })).rejects.toMatchObject({
      kind: 'missing',
      code: 'NOTICE_RULE_MISSING'
    });
  });

  it('returns named invalid domain evidence for provider validation and convergence', async () => {
    const invalidCreate = noticeRuleDataProvider.create({
      resource: 'notice-rules',
      variables: { ...variables, draft: { ...draft, id: 31 } }
    });
    await expect(invalidCreate).rejects.toBeInstanceOf(NoticeRuleContractError);
    await expect(invalidCreate).rejects.toMatchObject({ kind: 'invalid', code: 'NOTICE_RULE_VARIABLES_INVALID' });

    api.loadOne.mockResolvedValueOnce({ ...rule, enable: false });
    await expect(
      noticeRuleDataProvider.update({
        resource: 'notice-rules',
        id: 31,
        variables: { ...variables, draft: { ...draft, id: 31 } }
      })
    ).rejects.toMatchObject({ kind: 'invalid', code: 'NOTICE_RULE_UPDATE_NOT_CONVERGED' });
  });
});
