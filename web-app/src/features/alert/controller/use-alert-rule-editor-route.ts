/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { alertRoutePaths } from '@/shared/navigation/app-paths';

import { loadAlertRule } from '../api/alert-rule-api';
import {
  alertRuleDraftFromDetail,
  alertRuleFailureKind,
  createAlertRuleDraft,
  type AlertRuleDraft
} from '../model/alert-rule-model';
import {
  freshAlertRuleRouteState,
  type AlertRuleEditorDetailState,
  type AlertRuleRouteState
} from './alert-rule-editor-state';
import { alertRuleQueryKeys } from './alert-rule-query-keys';
import { useAlertRuleEditorIdentity } from './use-alert-rule-editor-identity';

export function useAlertRuleEditorRoute(mode: 'new' | 'edit') {
  const navigate = useNavigate();
  const location = useLocation();
  const { ruleId = '' } = useParams();
  const validId = canonicalId(ruleId);
  const routeSource = `${mode}:${ruleId}:${location.key}`;
  const routeToken = useMemo(() => Symbol(routeSource), [routeSource]);
  const identity = useAlertRuleEditorIdentity(routeToken);
  const initialDraft = useMemo(() => (mode === 'new' ? createAlertRuleDraft() : null), [mode]);
  const [routeState, setRouteState] = useState<AlertRuleRouteState>(() =>
    freshAlertRuleRouteState(routeSource, routeToken, initialDraft)
  );
  const detailQuery = useAlertRuleDetail(mode, validId);
  const canonicalDraft = resolveCanonicalDraft(mode, initialDraft, detailQuery.data);
  const active =
    routeState.source === routeSource && routeState.token === routeToken
      ? routeState
      : freshAlertRuleRouteState(routeSource, routeToken, canonicalDraft);
  const draft = active.draft ?? canonicalDraft;
  const updateRoute = (patch: Partial<AlertRuleRouteState>) =>
    setRouteState(current => {
      const base =
        current.source === routeSource && current.token === routeToken
          ? current
          : freshAlertRuleRouteState(routeSource, routeToken, draft);
      return { ...base, ...patch };
    });
  return {
    active,
    detail: resolveDetail(mode, validId, detailQuery.isPending, detailQuery.error, draft),
    draft,
    identity,
    updateRoute,
    retryDetail: () =>
      mode === 'edit' && validId !== null ? detailQuery.refetch().then(() => undefined) : Promise.resolve(),
    cancel: () => {
      void navigate(alertRoutePaths.rules);
    }
  };
}

function resolveCanonicalDraft(
  mode: 'new' | 'edit',
  initialDraft: AlertRuleDraft | null,
  detail: Parameters<typeof alertRuleDraftFromDetail>[0] | undefined
) {
  if (mode === 'new') return initialDraft;
  return detail ? alertRuleDraftFromDetail(detail) : null;
}

function useAlertRuleDetail(mode: 'new' | 'edit', validId: number | null) {
  const detailId = mode === 'edit' ? validId : null;
  return useQuery({
    queryKey: alertRuleQueryKeys.detail(detailId),
    queryFn: detailId === null ? skipToken : ({ signal }) => loadAlertRule(detailId, signal),
    retry: false
  });
}

function resolveDetail(
  mode: 'new' | 'edit',
  id: number | null,
  pending: boolean,
  error: Error | null,
  draft: AlertRuleDraft | null
): AlertRuleEditorDetailState {
  if (mode === 'new') return draft ? { kind: 'ready' } : { kind: 'error' };
  if (id === null) return { kind: 'error' };
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertRuleFailureKind(error) };
  return draft ? { kind: 'ready' } : { kind: 'loading' };
}

function canonicalId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
