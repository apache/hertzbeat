/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { DataProvider } from '@refinedev/core';

import type { NoticeRule, NoticeRuleMutationVariables } from '../model/notice-rule-model';
import {
  isNoticeRuleCommitUncertain,
  NoticeRuleContractError,
  noticeRuleFailureKind,
  noticeRuleWriteOutcome
} from '../model/notice-rule-failure';
import type { NoticeRuleOperationReceipt } from '../model/notice-rule-operation-state';
import { noticeRuleResourceName } from '../notice-rule-resource';
import { proveNoticeRuleReceipt } from './notice-rule-operation-proof';
import type { NoticeRuleOperationOwner } from './notice-rule-command-gate';
import type { NoticeRuleCommandContext } from './notice-rule-command-types';

export async function runNoticeRuleReceipt(
  context: NoticeRuleCommandContext,
  receipt: NoticeRuleOperationReceipt,
  owner: NoticeRuleOperationOwner
) {
  try {
    if (receipt.phase === 'write') {
      await writeReceipt(context.provider, receipt);
      if (!context.gate.isCurrent(owner)) return false;
      // Provider mutations resolve after canonical proof, so only visible projection remains.
      receipt.phase = 'projection';
    }
    if (receipt.phase === 'proof') {
      await proveNoticeRuleReceipt(context.provider, receipt);
      if (!context.gate.isCurrent(owner)) return false;
      receipt.phase = 'projection';
    }
    await context.list.refreshAuthoritatively();
    if (!context.gate.isCurrent(owner)) return false;
    completeReceipt(context, receipt, owner);
    return true;
  } catch (reason) {
    if (!context.gate.isCurrent(owner)) return false;
    const retained = recoverOrReject(context, receipt, reason, owner);
    const failure = recoveryFailure(receipt, reason);
    if (retained) context.gate.markRecovery(owner, failure);
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

function recoverOrReject(
  context: NoticeRuleCommandContext,
  receipt: NoticeRuleOperationReceipt,
  reason: unknown,
  owner: NoticeRuleOperationOwner
) {
  if (receipt.phase === 'write' && noticeRuleWriteOutcome(reason) === 'rejected') {
    context.gate.clear(owner);
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

function completeReceipt(
  context: NoticeRuleCommandContext,
  receipt: NoticeRuleOperationReceipt,
  owner: NoticeRuleOperationOwner
) {
  context.gate.clear(owner);
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
  if (failure === 'commit-uncertain' || retained) return context.notify.proofFailure(failure);
  if (receipt.kind === 'delete') context.notify.deleteFailure(failure);
  else context.notify.saveFailure(failure);
}
