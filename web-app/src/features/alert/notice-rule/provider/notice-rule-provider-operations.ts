/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { BaseRecord, CreateResponse, DeleteOneResponse, UpdateResponse } from '@refinedev/core';

import { deleteNoticeRule, loadAllNoticeRulesByName, loadNoticeRule, saveNoticeRule } from '../api/notice-rule-api';
import {
  NoticeRuleCommitUncertainFailure,
  NoticeRuleContractError,
  NoticeRuleDomainFailure,
  noticeRuleFailureKind,
  noticeRuleProofFailure,
  preserveNoticeRuleFailure
} from '../model/notice-rule-failure';
import { noticeRuleMatchesDraft, type NoticeRuleMutationVariables } from '../model/notice-rule-model';
import { adaptRefineRecord } from '@/shared/refine/refine-provider-data';

type MutationPhase = 'preflight' | 'write' | 'proof';

export async function createNoticeRuleRecord<TData extends BaseRecord>(
  variables: NoticeRuleMutationVariables
): Promise<CreateResponse<TData>> {
  const before = await protectMutation(() => loadAllNoticeRulesByName(variables.draft.name.trim()), 'preflight');
  const previousIds = new Set(before.map(rule => rule.id));
  await protectMutation(() => saveNoticeRule(variables.draft, variables.receivers, variables.templates), 'write');
  return protectMutation(async () => {
    const after = await loadAllNoticeRulesByName(variables.draft.name.trim());
    const created = after.filter(
      rule =>
        !previousIds.has(rule.id) &&
        noticeRuleMatchesDraft(rule, variables.draft, variables.receivers, variables.templates)
    );
    const canonical = created[0];
    if (created.length > 1) throw new NoticeRuleCommitUncertainFailure();
    if (!canonical) throw contractError('NOTICE_RULE_CREATE_NOT_CONVERGED');
    return { data: adaptRefineRecord<TData>(canonical) };
  }, 'proof');
}

export async function updateNoticeRuleRecord<TData extends BaseRecord>(
  id: number,
  variables: NoticeRuleMutationVariables
): Promise<UpdateResponse<TData>> {
  await protectMutation(() => saveNoticeRule(variables.draft, variables.receivers, variables.templates), 'write');
  return protectMutation(async () => {
    const canonical = await loadNoticeRule(id);
    if (!noticeRuleMatchesDraft(canonical, variables.draft, variables.receivers, variables.templates)) {
      throw contractError('NOTICE_RULE_UPDATE_NOT_CONVERGED');
    }
    return { data: adaptRefineRecord<TData>(canonical) };
  }, 'proof');
}

export async function deleteNoticeRuleRecord<TData extends BaseRecord>(id: number): Promise<DeleteOneResponse<TData>> {
  const canonical = await protectMutation(() => loadNoticeRule(id), 'preflight');
  await protectMutation(() => deleteNoticeRule(id), 'write');
  await protectMutation(() => proveDeleted(id), 'proof');
  return { data: adaptRefineRecord<TData>(canonical) };
}

async function protectMutation<T>(operation: () => Promise<T>, phase: MutationPhase): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (phase === 'proof') throw noticeRuleProofFailure(error);
    const failure = preserveNoticeRuleFailure(error, noticeRuleFailureKind(error));
    if (phase === 'write') throw failure;
    throw new NoticeRuleDomainFailure(failure.kind, failure.code, undefined, 'rejected');
  }
}

async function proveDeleted(id: number) {
  try {
    await loadNoticeRule(id);
  } catch (error) {
    if (noticeRuleFailureKind(error) === 'missing') return;
    throw error;
  }
  throw contractError('NOTICE_RULE_DELETE_NOT_CONVERGED');
}

function contractError(code: string) {
  return new NoticeRuleContractError(code);
}
