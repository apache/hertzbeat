/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { DataProvider } from '@refinedev/core';

import {
  noticeRuleDraftFromDetail,
  validateNoticeRuleDependencies,
  validateNoticeRuleDraft,
  type NoticeRule,
  type NoticeRuleDraft,
  type NoticeRuleMutationVariables
} from '../model/notice-rule-model';
import {
  noticeRuleFailureKind,
  isNoticeRuleCommitUncertain,
  NoticeRuleContractError,
  noticeRuleVariablesInvalidFailure,
  noticeRuleWriteFailureKind,
  noticeRuleWriteOutcome
} from '../model/notice-rule-failure';
import type { NoticeRuleOperationReceipt } from '../model/notice-rule-operation-state';
import { noticeRuleResourceName } from '../notice-rule-resource';
import {
  freezeNoticeRuleVariables,
  proveNoticeRuleReceipt,
  scanNoticeRulesByName
} from './notice-rule-operation-proof';
import { canPersistNoticeRule, canPerformRetainedNoticeRuleAction } from './notice-rule-action-admission';
import type { NoticeRuleCommandContext } from './notice-rule-command-types';

export async function persistNoticeRule(context: NoticeRuleCommandContext, draft: NoticeRuleDraft | null) {
  if (!canPersistNoticeRule(context.capabilities, draft)) return false;
  if (context.options.kind !== 'ready') return false;
  if (!draft || !validMutation(draft, context)) {
    context.notify.validation();
    return false;
  }
  if (!context.gate.begin('saving')) return false;
  try {
    const variables = freezeNoticeRuleVariables(mutationVariables(draft, context));
    const receipt = await preparePersistReceipt(context.provider, variables);
    if (!context.gate.isOwnerAlive()) return false;
    context.gate.retain(receipt);
    context.editor.invalidateDetail();
    return await runReceipt(context, receipt);
  } catch (reason) {
    rejectPreflight(context, reason);
    return false;
  } finally {
    context.gate.end();
  }
}

export async function toggleNoticeRule(context: NoticeRuleCommandContext, rule: NoticeRule, enable: boolean) {
  if (!context.capabilities.canToggle) return false;
  if (context.options.kind !== 'ready' || !context.gate.begin('toggling', rule.id)) return false;
  try {
    const current = await context.loadDetail(rule.id);
    if (!context.gate.isOwnerAlive()) return false;
    const draft = { ...noticeRuleDraftFromDetail(current), enable };
    if (!validMutation(draft, context)) throw noticeRuleVariablesInvalidFailure();
    const receipt: NoticeRuleOperationReceipt = {
      kind: 'toggle',
      phase: 'write',
      id: rule.id,
      variables: freezeNoticeRuleVariables(mutationVariables(draft, context))
    };
    context.gate.retain(receipt);
    context.editor.invalidateDetail();
    return await runReceipt(context, receipt);
  } catch (reason) {
    rejectPreflight(context, reason);
    return false;
  } finally {
    context.gate.end();
  }
}

export async function removeNoticeRule(context: NoticeRuleCommandContext, rule: NoticeRule) {
  if (!context.capabilities.canDelete) return false;
  if (!context.gate.begin('deleting')) return false;
  const receipt: NoticeRuleOperationReceipt = { kind: 'delete', phase: 'write', id: rule.id };
  context.gate.retain(receipt);
  context.editor.invalidateDetail();
  try {
    return await runReceipt(context, receipt);
  } finally {
    context.gate.end();
  }
}

export async function retryNoticeRuleOperation(context: NoticeRuleCommandContext) {
  if (!canPerformRetainedNoticeRuleAction(context.capabilities, context.gate.retainedReceipt())) return false;
  const receipt = context.gate.beginRecovery();
  if (!receipt) return false;
  try {
    return await runReceipt(context, receipt);
  } finally {
    context.gate.end();
  }
}

async function preparePersistReceipt(provider: DataProvider, variables: NoticeRuleMutationVariables) {
  const draft = variables.draft;
  if (draft.id !== undefined) {
    return { kind: 'update', phase: 'write', id: draft.id, variables } as const;
  }
  const before = await scanNoticeRulesByName(provider, draft.name.trim());
  return { kind: 'create', phase: 'write', previousIds: new Set(before.map(rule => rule.id)), variables } as const;
}

async function runReceipt(context: NoticeRuleCommandContext, receipt: NoticeRuleOperationReceipt) {
  try {
    if (receipt.phase === 'write') {
      await writeReceipt(context.provider, receipt);
      if (!context.gate.isOwnerAlive()) return false;
      // A provider mutation resolves only after its own canonical proof; the
      // outer receipt therefore advances directly to visible-list projection.
      receipt.phase = 'projection';
    }
    if (receipt.phase === 'proof') {
      await proveNoticeRuleReceipt(context.provider, receipt);
      if (!context.gate.isOwnerAlive()) return false;
      receipt.phase = 'projection';
    }
    await context.list.refreshAuthoritatively();
    if (!context.gate.isOwnerAlive()) return false;
    completeReceipt(context, receipt);
    return true;
  } catch (reason) {
    if (!context.gate.isOwnerAlive()) return false;
    const retained = recoverOrReject(context, receipt, reason);
    const failure = recoveryFailure(receipt, reason);
    if (retained) context.gate.markRecovery(failure);
    notifyFailure(context, receipt, failure, retained);
    return false;
  }
}

async function writeReceipt(provider: DataProvider, receipt: NoticeRuleOperationReceipt) {
  if (receipt.kind === 'create') {
    if (!provider.create) throw new NoticeRuleContractError('NOTICE_RULE_CREATE_UNAVAILABLE');
    return provider.create<NoticeRule, NoticeRuleMutationVariables>({
      resource: noticeRuleResourceName,
      variables: receipt.variables
    });
  }
  if (receipt.kind === 'delete') {
    if (!provider.deleteOne) throw new NoticeRuleContractError('NOTICE_RULE_DELETE_UNAVAILABLE');
    return provider.deleteOne<NoticeRule>({ resource: noticeRuleResourceName, id: receipt.id });
  }
  if (!provider.update) throw new NoticeRuleContractError('NOTICE_RULE_UPDATE_UNAVAILABLE');
  return provider.update<NoticeRule, NoticeRuleMutationVariables>({
    resource: noticeRuleResourceName,
    id: receipt.id,
    variables: receipt.variables
  });
}

function recoverOrReject(context: NoticeRuleCommandContext, receipt: NoticeRuleOperationReceipt, reason: unknown) {
  if (receipt.phase === 'write' && noticeRuleWriteOutcome(reason) === 'rejected') {
    context.gate.clear();
    return false;
  }
  if (isNoticeRuleCommitUncertain(reason) && receipt.kind === 'create') receipt.phase = 'commit-uncertain';
  if (receipt.phase === 'write') receipt.phase = 'proof';
  return true;
}

function recoveryFailure(
  receipt: NoticeRuleOperationReceipt,
  reason: unknown
): 'unavailable' | 'error' | 'commit-uncertain' {
  if (receipt.kind === 'create' && isNoticeRuleCommitUncertain(reason)) return 'commit-uncertain';
  return noticeRuleFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
}

function completeReceipt(context: NoticeRuleCommandContext, receipt: NoticeRuleOperationReceipt) {
  context.gate.clear();
  if (receipt.kind === 'create' || receipt.kind === 'update') context.editor.setDraft(null);
  if (receipt.kind === 'delete') context.notify.deleteSuccess();
  else context.notify.saveSuccess();
}

function notifyFailure(
  context: NoticeRuleCommandContext,
  receipt: NoticeRuleOperationReceipt,
  failure: 'unavailable' | 'error' | 'commit-uncertain',
  retained: boolean
) {
  if (failure === 'commit-uncertain') return context.notify.proofFailure(failure);
  if (retained) return context.notify.proofFailure(failure);
  if (receipt.kind === 'delete') context.notify.deleteFailure(failure);
  else context.notify.saveFailure(failure);
}

function rejectPreflight(context: NoticeRuleCommandContext, reason: unknown) {
  context.gate.clear();
  context.notify.saveFailure(noticeRuleWriteFailureKind(reason));
}

function mutationVariables(draft: NoticeRuleDraft, context: NoticeRuleCommandContext): NoticeRuleMutationVariables {
  return { draft, receivers: context.options.receivers, templates: context.options.templates };
}

function validMutation(draft: NoticeRuleDraft, context: NoticeRuleCommandContext) {
  return (
    validateNoticeRuleDraft(draft).length === 0 &&
    validateNoticeRuleDependencies(draft, context.options.receivers, context.options.templates).length === 0
  );
}
