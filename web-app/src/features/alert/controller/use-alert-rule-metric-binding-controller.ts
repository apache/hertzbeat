/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { classifyMonitorReadError, loadMonitorsByApp, MonitorContractError, type Monitor } from '@/features/monitor';

import {
  buildMetricAlertBindingsPatch,
  metricAlertFieldsForTarget,
  type AlertRuleDraft,
  type MetricAlertField
} from '../model/alert-rule-model';
import { alertRuleQueryKeys } from './alert-rule-query-keys';
import type { AlertRuleMetricTargetState } from './use-alert-rule-metric-target-controller';

type BindingFailure = 'unavailable' | 'contract-error' | 'error';
type BindingEvidence =
  | { kind: 'idle' | 'loading' | 'empty' }
  | { kind: BindingFailure }
  | { kind: 'ready'; monitors: Monitor[]; labels: string[] };
type BindingContext = { app: string; fields: MetricAlertField[]; key: string };
type BindingSession = { key: string; monitorIds: number[]; labels: string[]; initialLabels: string[] };
type UpdateDraft = (patch: Partial<AlertRuleDraft>) => void;
type SetBindingSession = (session: BindingSession | null) => void;

/** Owns remote binding evidence and a discardable modal editing session. */
export function useAlertRuleMetricBindingController(
  draft: AlertRuleDraft | null,
  targetState: AlertRuleMetricTargetState,
  updateDraft: UpdateDraft
) {
  const context = bindingContext(draft, targetState);
  const contextKey = context?.key ?? null;
  const { session: activeSession, setSession } = useContextBoundBindingSession(contextKey);
  const query = useQuery({
    queryKey: alertRuleQueryKeys.targetBindings(context?.app ?? ''),
    queryFn: activeSession && context ? ({ signal }) => loadMonitorsByApp(context.app, signal) : skipToken,
    retry: false
  });
  const evidence = activeSession ? resolveEvidence(query) : { kind: 'idle' as const };

  return {
    state: bindingControllerState(context, activeSession, evidence),
    ...bindingCommands({
      activeSession,
      context,
      draft,
      evidence,
      refetch: query.refetch,
      setSession,
      updateDraft
    })
  };
}

type BindingSessionStore = {
  contextKey: string | null;
  session: BindingSession | null;
};

function useContextBoundBindingSession(contextKey: string | null) {
  const [store, setStore] = useState<BindingSessionStore>(() => ({ contextKey, session: null }));
  const setSession: SetBindingSession = session => setStore({ contextKey, session });
  if (store.contextKey !== contextKey) {
    // Guarded previous-context adjustment retires stale edits before descendants observe this render.
    setStore({ contextKey, session: null });
    return { session: null, setSession };
  }
  return { session: store.session, setSession };
}

function bindingControllerState(
  context: BindingContext | null,
  session: BindingSession | null,
  evidence: BindingEvidence
) {
  return {
    eligible: context !== null,
    open: session !== null,
    evidence,
    selectedMonitorIds: session?.monitorIds ?? [],
    selectedLabels: session?.labels ?? [],
    labelChoices: session ? bindingLabels(session, evidence) : []
  };
}

type BindingCommandContext = {
  activeSession: BindingSession | null;
  context: BindingContext | null;
  draft: AlertRuleDraft | null;
  evidence: BindingEvidence;
  refetch: () => Promise<unknown>;
  setSession: SetBindingSession;
  updateDraft: UpdateDraft;
};

function bindingCommands(command: BindingCommandContext) {
  return {
    open: () => openBindingSession(command),
    cancel: () => command.setSession(null),
    confirm: () => confirmBindingSession(command),
    changeMonitorIds: (monitorIds: number[]) => changeBindingMonitorIds(command, monitorIds),
    changeLabels: (labels: string[]) => changeBindingLabels(command, labels),
    retry: async () => {
      if (command.activeSession) await command.refetch();
    }
  };
}

function openBindingSession(command: BindingCommandContext) {
  const editor = command.draft?.metricEditor;
  if (!command.context || editor?.kind !== 'targeted') return;
  command.setSession({
    key: command.context.key,
    monitorIds: [...editor.monitorIds],
    labels: [...editor.monitorLabels],
    initialLabels: [...editor.monitorLabels]
  });
}

function confirmBindingSession(command: BindingCommandContext) {
  if (!command.draft || !command.context || !command.activeSession || !isConfirmable(command.evidence)) return;
  command.updateDraft(
    buildMetricAlertBindingsPatch(
      command.draft,
      command.activeSession.monitorIds,
      command.activeSession.labels,
      command.context.fields
    )
  );
  command.setSession(null);
}

function changeBindingMonitorIds(command: BindingCommandContext, monitorIds: number[]) {
  if (command.evidence.kind !== 'ready' || !command.activeSession) return;
  const available = new Set(command.evidence.monitors.map(monitor => monitor.id));
  if (monitorIds.some(id => !available.has(id))) return;
  command.setSession({ ...command.activeSession, monitorIds: [...monitorIds] });
}

function changeBindingLabels(command: BindingCommandContext, labels: string[]) {
  if (!isConfirmable(command.evidence) || !command.activeSession) return;
  const available = new Set(bindingLabels(command.activeSession, command.evidence));
  if (labels.some(label => !available.has(label))) return;
  command.setSession({ ...command.activeSession, labels: [...labels] });
}

function bindingContext(draft: AlertRuleDraft | null, state: AlertRuleMetricTargetState): BindingContext | null {
  if (draft?.kind !== 'realtime' || draft.dataType !== 'metric') return null;
  const editor = draft.metricEditor;
  if (editor?.kind !== 'targeted' || !editor.app || !editor.target) return null;
  if (editor.target.app !== editor.app) return null;
  if (editor.target.kind === 'availability') {
    return { app: editor.app, fields: [], key: `${editor.app}:availability` };
  }
  return metricBindingContext(editor.app, editor.target, state);
}

function metricBindingContext(
  app: string,
  target: { kind: 'metric'; app: string; metric: string },
  state: AlertRuleMetricTargetState
): BindingContext | null {
  if (state.hierarchy.kind !== 'ready') return null;
  try {
    const fields = metricAlertFieldsForTarget(state.hierarchy.hierarchy, target);
    if (!fields) return null;
    return { app, fields, key: `${app}:metric:${target.metric}` };
  } catch {
    return null;
  }
}

function resolveEvidence(query: QueryEvidence<Monitor[]>): BindingEvidence {
  if (query.isPending || query.fetchStatus !== 'idle') return { kind: 'loading' };
  if (query.isError) return { kind: bindingFailure(query.error) };
  if (query.data === undefined) return { kind: 'error' };
  if (query.data.length === 0) return { kind: 'empty' };
  return { kind: 'ready', monitors: query.data, labels: monitorLabels(query.data) };
}

function monitorLabels(monitors: Monitor[]) {
  return [
    ...new Set(
      monitors.flatMap(monitor => Object.entries(monitor.labels ?? {}).map(([name, value]) => `${name}:${value}`))
    )
  ].sort((left, right) => left.localeCompare(right));
}

function bindingFailure(error: unknown): BindingFailure {
  if (error instanceof MonitorContractError) return 'contract-error';
  return classifyMonitorReadError(error) === 'unavailable' ? 'unavailable' : 'error';
}

function isConfirmable(evidence: BindingEvidence) {
  return evidence.kind === 'ready' || evidence.kind === 'empty';
}

function bindingLabels(session: BindingSession, evidence: BindingEvidence) {
  return [...new Set([...session.initialLabels, ...(evidence.kind === 'ready' ? evidence.labels : [])])];
}

type QueryEvidence<T> = {
  isPending: boolean;
  isError: boolean;
  fetchStatus: 'idle' | 'fetching' | 'paused';
  data: T | undefined;
  error: unknown;
};
