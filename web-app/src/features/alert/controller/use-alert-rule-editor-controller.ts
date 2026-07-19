/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { classifyAlertRuleReadError, loadAlertRule } from '../alert-rule-api';
import {
  alertRuleDraftFromDetail,
  createAlertRuleDraft,
  type AlertRuleDraft,
  type AlertRuleKind
} from '../alert-rule-model';
import {
  freshAlertRuleRouteState,
  type AlertRuleEditorDetailState,
  type AlertRuleEditorIdentityController,
  type AlertRuleEditorOperationIdentity,
  type AlertRuleRouteState
} from './alert-rule-editor-state';
import { alertRuleQueryKeys } from './alert-rule-query-keys';
import { useAlertRuleCommandController } from './use-alert-rule-command-controller';
import { useAlertRulePreviewController } from './use-alert-rule-preview-controller';

export type {
  AlertRuleEditorDetailState,
  AlertRuleEditorFailure,
  AlertRulePreviewState
} from './alert-rule-editor-state';

export function useAlertRuleEditorController(mode: 'new' | 'edit') {
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
  const command = useAlertRuleCommandController(mode, draft, identity, updateRoute);
  const preview = useAlertRulePreviewController(draft, identity, updateRoute);
  const updateDraft = (patch: Partial<AlertRuleDraft>) => {
    if (!draft || command.isLocked()) return;
    identity.invalidate();
    preview.invalidate();
    updateRoute({ draft: { ...draft, ...patch }, preview: { kind: 'idle' }, saveFailure: undefined });
  };
  const changeKind = (kind: AlertRuleKind) => {
    if (!draft) return;
    updateDraft({ kind, dataType: kind === 'realtime' && draft.dataType === 'trace' ? 'metric' : draft.dataType });
  };
  return {
    state: {
      command: active.command,
      detail: resolveDetail(mode, validId, detailQuery.isPending, detailQuery.error, draft),
      draft,
      preview: active.preview,
      saveFailure: active.saveFailure
    },
    updateDraft,
    changeKind,
    preview: preview.preview,
    save: command.save,
    retryDetail: () =>
      mode === 'edit' && validId !== null ? detailQuery.refetch().then(() => undefined) : Promise.resolve(),
    cancel: () => {
      void navigate('/alerts/rules');
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
  return useQuery({
    queryKey: alertRuleQueryKeys.detail(validId),
    queryFn: () => loadAlertRule(validId as number),
    enabled: mode === 'edit' && validId !== null,
    retry: false
  });
}

function useAlertRuleEditorIdentity(routeToken: symbol): AlertRuleEditorIdentityController {
  const routeTokenRef = useRef<symbol | null>(routeToken);
  const editorEpochRef = useRef(0);
  useLayoutEffect(() => {
    routeTokenRef.current = routeToken;
  }, [routeToken]);
  useEffect(
    () => () => {
      routeTokenRef.current = null;
      editorEpochRef.current += 1;
    },
    []
  );
  const capture = (): AlertRuleEditorOperationIdentity => ({
    routeToken,
    editorEpoch: editorEpochRef.current
  });
  return {
    capture,
    invalidate: () => {
      editorEpochRef.current += 1;
    },
    isCurrent: owner => routeTokenRef.current === owner.routeToken && editorEpochRef.current === owner.editorEpoch
  };
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
  if (error) return { kind: classifyAlertRuleReadError(error) };
  return draft ? { kind: 'ready' } : { kind: 'loading' };
}

function canonicalId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
