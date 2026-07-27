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
import { noticeRuleVariablesInvalidFailure, noticeRuleWriteFailureKind } from '../model/notice-rule-failure';
import type { NoticeRuleOperationReceipt } from '../model/notice-rule-operation-state';
import { freezeNoticeRuleVariables, scanNoticeRulesByName } from './notice-rule-operation-proof';
import { canPersistNoticeRule, canPerformRetainedNoticeRuleAction } from './notice-rule-action-admission';
import type { NoticeRuleOperationOwner } from './notice-rule-command-gate';
import type { NoticeRuleCommandContext } from './notice-rule-command-types';
import { runNoticeRuleReceipt } from './notice-rule-receipt-runner';

export async function persistNoticeRule(context: NoticeRuleCommandContext, draft: NoticeRuleDraft | null) {
  if (!canPersistNoticeRule(context.capabilities, draft)) return false;
  if (context.options.kind !== 'ready') return false;
  if (!draft || !validMutation(draft, context)) {
    context.notify.validation();
    return false;
  }
  const owner = context.gate.begin('saving', draft.id === undefined ? 'create' : 'edit');
  if (!owner) return false;
  try {
    const variables = freezeNoticeRuleVariables(mutationVariables(draft, context));
    const receipt = await preparePersistReceipt(context.provider, variables);
    if (!context.gate.isCurrent(owner)) return false;
    context.gate.retain(owner, receipt);
    context.editor.invalidateDetail();
    return await runNoticeRuleReceipt(context, receipt, owner);
  } catch (reason) {
    if (context.gate.isCurrent(owner)) rejectPreflight(context, reason, owner);
    return false;
  } finally {
    context.gate.end(owner);
  }
}

export async function toggleNoticeRule(context: NoticeRuleCommandContext, rule: NoticeRule, enable: boolean) {
  if (!context.capabilities.canToggle) return false;
  if (context.options.kind !== 'ready') return false;
  const owner = context.gate.begin('toggling', 'toggle', rule.id);
  if (!owner) return false;
  try {
    const current = await context.loadDetail(rule.id);
    if (!context.gate.isCurrent(owner)) return false;
    const draft = { ...noticeRuleDraftFromDetail(current), enable };
    if (!validMutation(draft, context)) throw noticeRuleVariablesInvalidFailure();
    const receipt: NoticeRuleOperationReceipt = {
      kind: 'toggle',
      phase: 'write',
      id: rule.id,
      variables: freezeNoticeRuleVariables(mutationVariables(draft, context))
    };
    context.gate.retain(owner, receipt);
    context.editor.invalidateDetail();
    return await runNoticeRuleReceipt(context, receipt, owner);
  } catch (reason) {
    if (context.gate.isCurrent(owner)) rejectPreflight(context, reason, owner);
    return false;
  } finally {
    context.gate.end(owner);
  }
}

export async function removeNoticeRule(context: NoticeRuleCommandContext, rule: NoticeRule) {
  if (!context.capabilities.canDelete) return false;
  const owner = context.gate.begin('deleting', 'delete');
  if (!owner) return false;
  const receipt: NoticeRuleOperationReceipt = { kind: 'delete', phase: 'write', id: rule.id };
  context.gate.retain(owner, receipt);
  context.editor.invalidateDetail();
  try {
    return await runNoticeRuleReceipt(context, receipt, owner);
  } finally {
    context.gate.end(owner);
  }
}

export async function retryNoticeRuleOperation(context: NoticeRuleCommandContext) {
  if (!canPerformRetainedNoticeRuleAction(context.capabilities, context.gate.retainedReceipt())) return false;
  const recovery = context.gate.beginRecovery();
  if (!recovery) return false;
  try {
    return await runNoticeRuleReceipt(context, recovery.receipt, recovery.owner);
  } finally {
    context.gate.end(recovery.owner);
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

function rejectPreflight(context: NoticeRuleCommandContext, reason: unknown, owner: NoticeRuleOperationOwner) {
  context.gate.clear(owner);
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
