/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  classifyEntityDeleteError,
  classifyEntityDetailReadError,
  deleteEntity,
  loadEntityDetail
} from '../api/entity-api';
import type { EntityNextActionType, EntityRecord } from '../model/entity-contract';
import {
  buildEntityExplorePath,
  buildEntityNextActionPath,
  entityNextActionRequiresWrite,
  type EntityExploreSignal
} from '../model/entity-operational-navigation';
import {
  buildEntityEditRoute,
  buildEntityDefinitionRoute,
  buildEntityNoiseControlPath,
  safeEntityReturnTo,
  type EntityDetailEvidence,
  type EntityNoiseControlType
} from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';
import { useEntityCapabilities } from './use-entity-capabilities';
import { useEntityMonitorsController } from './use-entity-monitors-controller';

export function useEntityDetailController() {
  const navigate = useNavigate();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const capabilities = useEntityCapabilities();
  const id = parseEntityId(entityId);
  const monitors = useEntityMonitorsController(id);
  const result = useQuery({
    queryKey: entityQueryKeys.detail(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadEntityDetail(id, signal),
    retry: false
  });
  const evidence = resolveDetail(id, result.isPending, result.error, result.data);
  const deletion = useEntityDeletion(
    evidence.kind === 'ready' ? evidence.detail.entity : undefined,
    params.get('returnTo'),
    capabilities.canDelete
  );
  return {
    state: {
      evidence,
      refreshing: result.isFetching && !result.isPending,
      canWrite: capabilities.canWrite,
      canDelete: capabilities.canDelete,
      monitors: monitors.state,
      ...deletion.state
    },
    actions: {
      refresh: () => {
        void result.refetch();
      },
      back: () => {
        void navigate(safeEntityReturnTo(params.get('returnTo')));
      },
      edit: () => {
        if (capabilities.canWrite && evidence.kind === 'ready')
          void navigate(buildEntityEditRoute(evidence.detail.entity.id, params.get('returnTo')));
      },
      definition: () => {
        if (capabilities.canWrite && evidence.kind === 'ready') {
          void navigate(buildEntityDefinitionRoute(evidence.detail.entity.id, params.get('returnTo')));
        }
      },
      explore: (signal: EntityExploreSignal) => {
        if (evidence.kind === 'ready') void navigate(buildEntityExplorePath(evidence.detail, signal));
      },
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
  const started = useRef(false);
  const deleteAdmitted = useRef(canDelete);
  useEffect(() => {
    deleteAdmitted.current = canDelete;
  }, [canDelete]);
  const deletion = useMutation({
    mutationFn: deleteExistingEntity,
    onSuccess: async (_result, deletedId) => {
      await invalidateDeletedEntity(client, deletedId);
      void navigate(safeEntityReturnTo(returnTo), { replace: true });
    }
  });
  const remove = () => {
    if (!canDelete || !entity || deletion.isPending || started.current) return;
    deletion.reset();
    modal.confirm({
      title: t('entity.delete.title', { name: entity.displayName || entity.name }),
      content: t('entity.delete.description'),
      okText: t('entity.delete.action'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (!deleteAdmitted.current || started.current) return;
        started.current = true;
        try {
          await deletion.mutateAsync(entity.id);
        } catch {
          // The mutation exposes only a localized failure class after the confirmation closes.
        } finally {
          started.current = false;
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
  detail: Awaited<ReturnType<typeof loadEntityDetail>> | undefined
): EntityDetailEvidence {
  if (id === undefined) return { kind: 'missing' };
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyEntityDetailReadError(error) };
  return detail ? { kind: 'ready', detail } : { kind: 'error' };
}

function parseEntityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
