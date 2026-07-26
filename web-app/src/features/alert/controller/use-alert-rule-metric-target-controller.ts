/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { resolveLocale } from '@/core/i18n/i18n';
import {
  classifyMonitorReadError,
  loadMonitorAppHierarchy,
  loadMonitorNavigationApps,
  monitorNavigationApps,
  type MonitorAppHierarchyNode
} from '@/features/monitor';

import { parseRealtimeMetricExpression, type AlertRuleDraft } from '../model/alert-rule-model';
import type {
  AlertRuleMetricTargetState,
  TargetApplicationsState,
  TargetHierarchyState
} from '../model/alert-rule-metric-target-state';
import { alertRuleQueryKeys } from './alert-rule-query-keys';

type TargetFailure = 'unavailable' | 'error';
export type {
  AlertRuleMetricTargetState,
  TargetApplicationsState,
  TargetHierarchyState
} from '../model/alert-rule-metric-target-state';

/** Owns cancellable Monitor catalog evidence for realtime metric authoring. */
export function useAlertRuleMetricTargetController(draft: AlertRuleDraft | null) {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.resolvedLanguage ?? i18n.language);
  const enabled = draft?.kind === 'realtime' && draft.dataType === 'metric';
  const selectedApp = enabled ? selectedMetricApp(draft) : '';
  const apps = useQuery({
    queryKey: alertRuleQueryKeys.targetApps(locale),
    queryFn: ({ signal }) => loadVisibleApplications(locale, signal),
    enabled,
    retry: false
  });
  const hierarchy = useQuery({
    queryKey: alertRuleQueryKeys.targetHierarchy(selectedApp, locale),
    queryFn: selectedApp && enabled ? ({ signal }) => loadMonitorAppHierarchy(selectedApp, locale, signal) : skipToken,
    retry: false
  });
  return {
    state: {
      apps: enabled ? resolveApplicationsState(apps) : { kind: 'idle' as const },
      hierarchy: selectedApp ? resolveHierarchyState(hierarchy) : { kind: 'idle' as const }
    },
    retryApps: async () => {
      if (enabled) await apps.refetch();
    },
    retryHierarchy: async () => {
      if (selectedApp) await hierarchy.refetch();
    }
  };
}

async function loadVisibleApplications(locale: string, signal: AbortSignal) {
  return monitorNavigationApps(await loadMonitorNavigationApps(locale, signal));
}

function selectedMetricApp(draft: AlertRuleDraft) {
  if (draft.metricEditor?.kind === 'targeted') return draft.metricEditor.app;
  return parseRealtimeMetricExpression(draft.expr)?.target.app ?? '';
}

function resolveApplicationsState(
  query: QueryEvidence<ReturnType<typeof monitorNavigationApps>>
): TargetApplicationsState {
  if (query.isPending || query.fetchStatus !== 'idle') return { kind: 'loading' };
  if (query.isError) return { kind: targetFailure(query.error) };
  return query.data === undefined ? { kind: 'error' } : { kind: 'ready', apps: query.data };
}

function resolveHierarchyState(query: QueryEvidence<MonitorAppHierarchyNode>): TargetHierarchyState {
  if (query.isPending || query.fetchStatus !== 'idle') return { kind: 'loading' };
  if (query.isError) return { kind: targetFailure(query.error) };
  return query.data === undefined ? { kind: 'error' } : { kind: 'ready', hierarchy: query.data };
}

type QueryEvidence<T> = {
  isPending: boolean;
  isError: boolean;
  fetchStatus: 'idle' | 'fetching' | 'paused';
  data: T | undefined;
  error: unknown;
};

function targetFailure(error: unknown): TargetFailure {
  return classifyMonitorReadError(error) === 'unavailable' ? 'unavailable' : 'error';
}
