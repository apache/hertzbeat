/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useRef } from 'react';

import { saveAlertRule } from '../api/alert-rule-api';
import {
  AlertRuleCreateIdentityUncertainError,
  captureAlertRuleCreateBaseline,
  proveCreatedAlertRule,
  proveUpdatedAlertRule
} from '../api/alert-rule-write-proof';
import {
  alertRuleFailureKind,
  alertRuleWriteOutcome,
  buildAlertRulePayload,
  AlertRuleRequestFailure,
  type AlertRuleDraft
} from '../model/alert-rule-model';
import type {
  AlertRuleEditorIdentityController,
  AlertRuleEditorOperationIdentity,
  AlertRuleRouteUpdate,
  AlertRuleSaveRecovery
} from './alert-rule-editor-state';

type AlertRuleSaveReceipt =
  | {
      mode: 'new';
      phase: 'baseline' | 'write' | 'proof' | 'commit-uncertain';
      draft: AlertRuleDraft;
      baselineIds?: number[];
    }
  | {
      mode: 'edit';
      phase: 'write' | 'proof';
      draft: AlertRuleDraft;
    };

type OwnedReceipt = { identity: AlertRuleEditorOperationIdentity; receipt: AlertRuleSaveReceipt };
type Attempt = { token: symbol; owned: OwnedReceipt };
type SaveNotifications = {
  success: () => void;
  failure: (kind: 'unavailable' | 'error', retained: boolean) => void;
};

export function useAlertRuleSaveOperation(
  mode: 'new' | 'edit',
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate,
  notifications: SaveNotifications,
  complete: () => void
) {
  const attemptRef = useRef<Attempt | null>(null);
  const receiptRef = useRef<OwnedReceipt | null>(null);
  const isLocked = () => isCurrent(attemptRef.current?.owned, identity) || isCurrent(receiptRef.current, identity);
  const save = async (draft: AlertRuleDraft) => {
    if (isLocked()) return;
    retireStale(attemptRef, receiptRef, identity);
    const owned = createOwnedReceipt(mode, draft, identity.capture());
    receiptRef.current = owned;
    await runAttempt(owned, attemptRef, receiptRef, identity, updateRoute, notifications, complete);
  };
  const retry = async () => {
    const owned = receiptRef.current;
    if (!owned || owned.receipt.phase !== 'proof' || !isCurrent(owned, identity) || attemptRef.current) return;
    await runAttempt(owned, attemptRef, receiptRef, identity, updateRoute, notifications, complete);
  };
  return { isLocked, retry, save };
}

async function runAttempt(
  owned: OwnedReceipt,
  attemptRef: { current: Attempt | null },
  receiptRef: { current: OwnedReceipt | null },
  identity: AlertRuleEditorIdentityController,
  updateRoute: AlertRuleRouteUpdate,
  notifications: SaveNotifications,
  complete: () => void
) {
  const attempt = { token: Symbol('alert-rule-save'), owned };
  attemptRef.current = attempt;
  updateRoute({ command: 'saving', saveFailure: undefined, recovery: undefined });
  try {
    await advanceReceipt(owned.receipt, () => isCurrent(owned, identity));
    if (!isAttemptCurrent(attempt, attemptRef, identity)) return;
    receiptRef.current = null;
    notifications.success();
    complete();
  } catch (reason) {
    if (!isAttemptCurrent(attempt, attemptRef, identity)) return;
    const recovery = recoverReceipt(owned.receipt, reason);
    if (!recovery) receiptRef.current = null;
    const failure = recovery?.failure ?? failureKind(reason);
    updateRoute({ saveFailure: failure, recovery });
    notifications.failure(failure, recovery !== undefined);
  } finally {
    if (attemptRef.current?.token === attempt.token) attemptRef.current = null;
    if (identity.isCurrent(owned.identity)) updateRoute({ command: 'idle' });
  }
}

async function advanceReceipt(receipt: AlertRuleSaveReceipt, current: () => boolean) {
  // A retained receipt moves forward only; proof recovery can never replay its write.
  if (receipt.phase === 'baseline') {
    receipt.baselineIds = await captureAlertRuleCreateBaseline(buildAlertRulePayload(receipt.draft).name);
    if (!current()) return;
    receipt.phase = 'write';
  }
  if (receipt.phase === 'write') {
    await saveAlertRule(receipt.mode, receipt.draft);
    if (!current()) return;
    receipt.phase = 'proof';
  }
  if (receipt.phase !== 'proof') return;
  const expected = buildAlertRulePayload(receipt.draft);
  if (receipt.mode === 'edit') await proveUpdatedAlertRule(receipt.draft, expected);
  else await proveCreatedAlertRule(expected, receipt.baselineIds ?? []);
}

function recoverReceipt(receipt: AlertRuleSaveReceipt, reason: unknown): AlertRuleSaveRecovery | undefined {
  if (receipt.phase === 'baseline' || (receipt.phase === 'write' && isDefiniteSourceRejection(reason))) {
    return undefined;
  }
  if (receipt.phase === 'write') receipt.phase = 'proof';
  if (receipt.mode === 'new' && reason instanceof AlertRuleCreateIdentityUncertainError) {
    receipt.phase = 'commit-uncertain';
    return { phase: 'commit-uncertain', failure: 'unavailable', retryable: false };
  }
  return { phase: 'proof', failure: failureKind(reason), retryable: true };
}

function isDefiniteSourceRejection(reason: unknown) {
  return reason instanceof AlertRuleRequestFailure && alertRuleWriteOutcome(reason) === 'rejected';
}

function createOwnedReceipt(
  mode: 'new' | 'edit',
  draft: AlertRuleDraft,
  identity: AlertRuleEditorOperationIdentity
): OwnedReceipt {
  const frozenDraft = cloneDraft(draft);
  if (mode === 'new') {
    return { identity, receipt: { mode: 'new', phase: 'baseline', draft: frozenDraft } };
  }
  return { identity, receipt: { mode: 'edit', phase: 'write', draft: frozenDraft } };
}

function cloneDraft(draft: AlertRuleDraft): AlertRuleDraft {
  return {
    ...draft,
    annotations: draft.annotations === null ? null : { ...draft.annotations },
    ...(draft.persisted && {
      persisted: {
        ...draft.persisted,
        labels: draft.persisted.labels === null ? null : { ...draft.persisted.labels }
      }
    })
  };
}

function failureKind(reason: unknown): 'unavailable' | 'error' {
  return alertRuleFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
}

function isCurrent(owned: OwnedReceipt | null | undefined, identity: AlertRuleEditorIdentityController) {
  return owned !== null && owned !== undefined && identity.isCurrent(owned.identity);
}

function isAttemptCurrent(
  attempt: Attempt,
  attemptRef: { current: Attempt | null },
  identity: AlertRuleEditorIdentityController
) {
  return attemptRef.current?.token === attempt.token && identity.isCurrent(attempt.owned.identity);
}

function retireStale(
  attemptRef: { current: Attempt | null },
  receiptRef: { current: OwnedReceipt | null },
  identity: AlertRuleEditorIdentityController
) {
  if (!isCurrent(attemptRef.current?.owned, identity)) attemptRef.current = null;
  if (!isCurrent(receiptRef.current, identity)) receiptRef.current = null;
}
