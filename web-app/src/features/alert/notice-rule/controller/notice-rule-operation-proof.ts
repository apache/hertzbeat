/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { DataProvider } from '@refinedev/core';

import {
  noticeRuleMatchesDraft,
  maximumNoticeRuleScanPages,
  noticeRulePageSizes,
  type NoticeRule,
  type NoticeRuleMutationVariables
} from '../model/notice-rule-model';
import {
  NoticeRuleCommitUncertainFailure,
  NoticeRuleContractError,
  noticeRuleFailureKind
} from '../model/notice-rule-failure';
import type { NoticeRuleOperationReceipt } from '../model/notice-rule-operation-state';
import { noticeRuleResourceName } from '../notice-rule-resource';

export async function scanNoticeRulesByName(provider: DataProvider, name: string) {
  if (!provider.getList) throw new NoticeRuleContractError('NOTICE_RULE_PROOF_UNAVAILABLE');
  const pageSize = noticeRulePageSizes.at(-1)!;
  const records: NoticeRule[] = [];
  let expectedTotal: number | undefined;
  for (let currentPage = 1; currentPage <= maximumNoticeRuleScanPages; currentPage += 1) {
    const response = await provider.getList<NoticeRule>({
      resource: noticeRuleResourceName,
      pagination: { currentPage, pageSize, mode: 'server' },
      filters: [{ field: 'name', operator: 'contains', value: name }]
    });
    expectedTotal ??= response.total;
    if (response.total !== expectedTotal) throw new NoticeRuleContractError('NOTICE_RULE_PAGE_SET_CHANGED');
    records.push(...response.data);
    if (records.length >= expectedTotal) break;
  }
  if (
    expectedTotal === undefined ||
    records.length !== expectedTotal ||
    new Set(records.map(record => record.id)).size !== records.length
  ) {
    throw new NoticeRuleContractError('NOTICE_RULE_FULL_SCAN_INVALID');
  }
  return records;
}

export async function proveNoticeRuleReceipt(provider: DataProvider, receipt: NoticeRuleOperationReceipt) {
  if (receipt.kind === 'create') {
    const records = await scanNoticeRulesByName(provider, receipt.variables.draft.name.trim());
    const created = records.filter(
      rule =>
        !receipt.previousIds.has(rule.id) &&
        noticeRuleMatchesDraft(rule, receipt.variables.draft, receipt.variables.receivers, receipt.variables.templates)
    );
    if (created.length > 1) throw new NoticeRuleCommitUncertainFailure();
    if (created.length === 0) throw new NoticeRuleContractError('NOTICE_RULE_CREATE_NOT_CONVERGED');
    return;
  }
  if (receipt.kind === 'delete') return proveNoticeRuleDeleted(provider, receipt.id);
  const canonical = await loadExactNoticeRule(provider, receipt.id);
  if (
    !noticeRuleMatchesDraft(
      canonical,
      receipt.variables.draft,
      receipt.variables.receivers,
      receipt.variables.templates
    )
  ) {
    throw new NoticeRuleContractError('NOTICE_RULE_UPDATE_NOT_CONVERGED');
  }
}

export function freezeNoticeRuleVariables(variables: NoticeRuleMutationVariables): NoticeRuleMutationVariables {
  return {
    draft: {
      ...variables.draft,
      receiverIds: [...variables.draft.receiverIds],
      receiverNames: [...variables.draft.receiverNames],
      days: [...variables.draft.days]
    },
    receivers: variables.receivers.map(receiver => ({ ...receiver })),
    templates: variables.templates.map(template => ({ ...template }))
  };
}

async function loadExactNoticeRule(provider: DataProvider, id: number) {
  if (!provider.getOne) throw new NoticeRuleContractError('NOTICE_RULE_PROOF_UNAVAILABLE');
  const response = await provider.getOne<NoticeRule>({ resource: noticeRuleResourceName, id });
  if (response.data.id !== id) throw new NoticeRuleContractError('NOTICE_RULE_DETAIL_INVALID');
  return response.data;
}

async function proveNoticeRuleDeleted(provider: DataProvider, id: number) {
  try {
    await loadExactNoticeRule(provider, id);
  } catch (reason) {
    if (noticeRuleFailureKind(reason) === 'missing') return;
    throw reason;
  }
  throw new NoticeRuleContractError('NOTICE_RULE_DELETE_NOT_CONVERGED');
}
