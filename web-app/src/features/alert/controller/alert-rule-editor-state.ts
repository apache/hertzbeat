/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AlertRuleDraft } from '../model/alert-rule-model';

export type AlertRuleEditorFailure = 'missing' | 'unavailable' | 'error';
export type AlertRuleEditorDetailState = { kind: 'loading' } | { kind: AlertRuleEditorFailure } | { kind: 'ready' };
export type AlertRulePreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; records: Array<Record<string, unknown>> }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export type AlertRuleSaveRecovery = {
  phase: 'proof' | 'commit-uncertain';
  failure: 'unavailable' | 'error';
  retryable: boolean;
};

export type AlertRuleRouteState = {
  source: string;
  token: symbol;
  draft: AlertRuleDraft | null;
  preview: AlertRulePreviewState;
  command: 'idle' | 'saving';
  saveFailure: AlertRuleEditorFailure | undefined;
  recovery: AlertRuleSaveRecovery | undefined;
};

export type AlertRuleEditorOperationIdentity = {
  routeToken: symbol;
  editorEpoch: number;
};

export type AlertRuleEditorIdentityController = {
  capture: () => AlertRuleEditorOperationIdentity;
  invalidate: () => void;
  isCurrent: (identity: AlertRuleEditorOperationIdentity) => boolean;
};

export type AlertRuleRouteUpdate = (patch: Partial<AlertRuleRouteState>) => void;

export function freshAlertRuleRouteState(
  source: string,
  token: symbol,
  draft: AlertRuleDraft | null
): AlertRuleRouteState {
  return {
    source,
    token,
    draft,
    preview: { kind: 'idle' },
    command: 'idle',
    saveFailure: undefined,
    recovery: undefined
  };
}
