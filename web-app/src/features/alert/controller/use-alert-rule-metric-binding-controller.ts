/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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

/** Owns remote binding evidence and a discardable modal editing session. */
export function useAlertRuleMetricBindingController(
  draft: AlertRuleDraft | null,
  targetState: AlertRuleMetricTargetState,
  updateDraft: UpdateDraft
) {
  const context = bindingContext(draft, targetState);
  const contextKey = context?.key ?? null;
  const [session, setSession] = useState<BindingSession | null>(null);
  const activeSession = context && session?.key === context.key ? session : null;
  useEffect(() => {
    setSession(current => (current && current.key !== contextKey ? null : current));
  }, [contextKey]);
  const query = useQuery({
    queryKey: alertRuleQueryKeys.targetBindings(context?.app ?? ''),
    queryFn: activeSession && context ? ({ signal }) => loadMonitorsByApp(context.app, signal) : skipToken,
    retry: false
  });
  const evidence = activeSession ? resolveEvidence(query) : { kind: 'idle' as const };

  return {
    state: {
      eligible: context !== null,
      open: activeSession !== null,
      evidence,
      selectedMonitorIds: activeSession?.monitorIds ?? [],
      selectedLabels: activeSession?.labels ?? [],
      labelChoices: activeSession ? bindingLabels(activeSession, evidence) : []
    },
    open: () => {
      if (!context || !draft || draft.metricEditor?.kind !== 'targeted') return;
      setSession({
        key: context.key,
        monitorIds: [...draft.metricEditor.monitorIds],
        labels: [...draft.metricEditor.monitorLabels],
        initialLabels: [...draft.metricEditor.monitorLabels]
      });
    },
    cancel: () => setSession(null),
    confirm: () => {
      if (!draft || !context || !activeSession || !isConfirmable(evidence)) return;
      updateDraft(buildMetricAlertBindingsPatch(draft, activeSession.monitorIds, activeSession.labels, context.fields));
      setSession(null);
    },
    changeMonitorIds: (monitorIds: number[]) => {
      if (evidence.kind !== 'ready' || !activeSession) return;
      const available = new Set(evidence.monitors.map(monitor => monitor.id));
      if (monitorIds.some(id => !available.has(id))) return;
      setSession({ ...activeSession, monitorIds: [...monitorIds] });
    },
    changeLabels: (labels: string[]) => {
      if (!isConfirmable(evidence) || !activeSession) return;
      const available = new Set(bindingLabels(activeSession, evidence));
      if (labels.some(label => !available.has(label))) return;
      setSession({ ...activeSession, labels: [...labels] });
    },
    retry: async () => {
      if (activeSession) await query.refetch();
    }
  };
}

function bindingContext(draft: AlertRuleDraft | null, state: AlertRuleMetricTargetState): BindingContext | null {
  if (draft?.kind !== 'realtime' || draft.dataType !== 'metric') return null;
  const editor = draft.metricEditor;
  if (editor?.kind !== 'targeted' || !editor.app || !editor.target) return null;
  if (editor.target.app !== editor.app) return null;
  if (editor.target.kind === 'availability') {
    return { app: editor.app, fields: [], key: `${editor.app}:availability` };
  }
  if (state.hierarchy.kind !== 'ready') return null;
  try {
    const fields = metricAlertFieldsForTarget(state.hierarchy.hierarchy, editor.target);
    return { app: editor.app, fields, key: `${editor.app}:metric:${editor.target.metric}` };
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
