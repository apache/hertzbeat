/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  classifyEntityDeleteError,
  classifyEntityDetailReadError,
  deleteEntity,
  loadEntityDetail,
  loadEntityIdentity
} from '../api/entity-api';
import type { EntityNextActionType, EntityRecord } from '../model/entity-contract';
import { buildEntityNextActionPath, entityNextActionRequiresWrite } from '../model/entity-operational-navigation';
import {
  buildEntityEditRoute,
  buildEntityDefinitionRoute,
  buildEntityNoiseControlPath,
  safeEntityReturnTo,
  type EntityDetailEvidence,
  type EntityNoiseControlType
} from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';
import { buildEntityInspectionActions } from './entity-detail-inspection-actions';
import { useEntityCapabilities } from './use-entity-capabilities';
import { useEntityMonitorsController } from './use-entity-monitors-controller';
import { useEntitySignalController } from './use-entity-signal-controller';

export function useEntityDetailController() {
  const navigate = useNavigate();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const capabilities = useEntityCapabilities();
  const id = parseEntityId(entityId);
  const monitors = useEntityMonitorsController(id);
  const result = useQuery({
    queryKey: entityQueryKeys.detail(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadEntityDetailEvidence(id, signal),
    retry: false
  });
  const evidence = resolveDetail(id, result.isPending, result.error, result.data);
  const entity = entityFromEvidence(evidence);
  const signals = useEntitySignalController(signalSourceFromEvidence(evidence));
  const deletion = useEntityDeletion(entity, params.get('returnTo'), capabilities.canDelete);
  const inspectionActions = buildEntityInspectionActions(evidence, signals.state, params.get('returnTo'), path => {
    void navigate(path);
  });
  return {
    state: {
      evidence,
      refreshing:
        (result.isFetching && !result.isPending) ||
        (signals.state?.kind === 'ready' && signals.state.refreshing === true),
      canWrite: capabilities.canWrite,
      canDelete: capabilities.canDelete,
      monitors: monitors.state,
      signals: signals.state,
      ...deletion.state
    },
    actions: {
      refresh: () => {
        void result.refetch();
        signals.refresh();
      },
      back: () => void navigate(safeEntityReturnTo(params.get('returnTo'))),
      edit: () => {
        if (capabilities.canWrite && entity) void navigate(buildEntityEditRoute(entity.id, params.get('returnTo')));
      },
      definition: () => {
        if (capabilities.canWrite && entity) {
          void navigate(buildEntityDefinitionRoute(entity.id, params.get('returnTo')));
        }
      },
      ...inspectionActions,
      manageNoiseControls: (ruleType: EntityNoiseControlType) => {
        if (evidence.kind === 'ready') void navigate(buildEntityNoiseControlPath(evidence.detail, ruleType));
      },
      nextAction: (actionType: EntityNextActionType) => {
        if (evidence.kind !== 'ready') return;
        if (entityNextActionRequiresWrite(actionType) && !capabilities.canWrite) return;
        const target = buildEntityNextActionPath(evidence.detail, actionType, params.get('returnTo'));
        if (target) void navigate(target);
      },
      ...monitors.actions,
      remove: deletion.remove
    }
  };
}

function useEntityDeletion(entity: EntityRecord | undefined, returnTo: string | null, canDelete: boolean) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const authority = useRef({ pending: false });
  const deletion = useMutation({
    mutationFn: ({ id }: { id: number; owner: { pending: boolean } }) => deleteExistingEntity(id),
    onSuccess: async (_result, { id, owner }) => {
      await invalidateDeletedEntity(client, id);
      if (authority.current === owner) void navigate(safeEntityReturnTo(returnTo), { replace: true });
    }
  });
  const resetDeletion = deletion.reset;
  useLayoutEffect(() => {
    authority.current = { pending: false };
    resetDeletion();
    return () => {
      authority.current = { pending: false };
    };
  }, [canDelete, location.key, resetDeletion]);
  const remove = () => {
    const owner = authority.current;
    if (!canDelete || !entity || deletion.isPending || owner.pending) return;
    deletion.reset();
    modal.confirm({
      title: t('entity.delete.title', { name: entity.displayName || entity.name }),
      content: t('entity.delete.description'),
      okText: t('entity.delete.action'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (authority.current !== owner || owner.pending) return;
        owner.pending = true;
        try {
          await deletion.mutateAsync({ id: entity.id, owner });
        } catch {
          // The mutation exposes only a localized failure class after the confirmation closes.
        } finally {
          owner.pending = false;
        }
      }
    });
  };
  return {
    state: {
      deleting: deletion.isPending,
      ...(deletion.error ? { deleteFailure: visibleDeleteFailure(deletion.error) } : {})
    },
    remove
  };
}

function visibleDeleteFailure(error: Error) {
  const failure = classifyEntityDeleteError(error);
  return failure === 'missing' ? ('error' as const) : failure;
}

async function deleteExistingEntity(id: number) {
  try {
    await deleteEntity(id);
  } catch (error) {
    if (classifyEntityDeleteError(error) === 'missing') return;
    throw error;
  }
}

function invalidateDeletedEntity(client: ReturnType<typeof useQueryClient>, id: number) {
  return Promise.all([
    client.invalidateQueries({ queryKey: entityQueryKeys.lists(), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.detail(id), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.editor(id), refetchType: 'none' })
  ]);
}

function resolveDetail(
  id: number | undefined,
  pending: boolean,
  error: Error | null,
  detail: Extract<EntityDetailEvidence, { kind: 'ready' | 'degraded' }> | undefined
): EntityDetailEvidence {
  if (id === undefined) return { kind: 'missing' };
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyEntityDetailReadError(error) };
  return detail ?? { kind: 'error' };
}

async function loadEntityDetailEvidence(
  id: number,
  signal: AbortSignal
): Promise<Extract<EntityDetailEvidence, { kind: 'ready' | 'degraded' }>> {
  try {
    return { kind: 'ready', detail: await loadEntityDetail(id, signal) };
  } catch (error) {
    if (signal.aborted || classifyEntityDetailReadError(error) !== 'unavailable') throw error;
    const entity = await loadEntityIdentity(id, signal);
    return { kind: 'degraded', entity, unavailable: 'telemetry' };
  }
}

function entityFromEvidence(evidence: EntityDetailEvidence) {
  if (evidence.kind === 'ready') return evidence.detail.entity;
  return evidence.kind === 'degraded' ? evidence.entity : undefined;
}

function signalSourceFromEvidence(evidence: EntityDetailEvidence) {
  if (evidence.kind === 'ready') return evidence.detail;
  return evidence.kind === 'degraded' ? evidence.entity : undefined;
}

function parseEntityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
