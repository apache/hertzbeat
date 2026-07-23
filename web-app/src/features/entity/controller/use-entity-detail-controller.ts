/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  classifyEntityDeleteError,
  classifyEntityDetailError,
  deleteEntity,
  loadEntityDetail
} from '../api/entity-api';
import type { EntityRecord } from '../model/entity-contract';
import {
  buildEntityEditRoute,
  buildEntityDefinitionRoute,
  buildEntityExplorePath,
  safeEntityReturnTo,
  type EntityDetailEvidence,
  type EntityExploreSignal
} from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';

export function useEntityDetailController() {
  const navigate = useNavigate();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const id = parseEntityId(entityId);
  const result = useQuery({
    queryKey: entityQueryKeys.detail(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadEntityDetail(id, signal),
    retry: false
  });
  const evidence = resolveDetail(id, result.isPending, result.error, result.data);
  const deletion = useEntityDeletion(
    evidence.kind === 'ready' ? evidence.detail.entity : undefined,
    params.get('returnTo')
  );
  return {
    state: { evidence, ...deletion.state },
    actions: {
      back: () => {
        void navigate(safeEntityReturnTo(params.get('returnTo')));
      },
      edit: () => {
        if (evidence.kind === 'ready')
          void navigate(buildEntityEditRoute(evidence.detail.entity.id, params.get('returnTo')));
      },
      definition: () => {
        if (evidence.kind === 'ready') {
          void navigate(buildEntityDefinitionRoute(evidence.detail.entity.id, params.get('returnTo')));
        }
      },
      explore: (signal: EntityExploreSignal) => {
        if (evidence.kind === 'ready') void navigate(buildEntityExplorePath(evidence.detail, signal));
      },
      remove: deletion.remove
    }
  };
}

function useEntityDeletion(entity: EntityRecord | undefined, returnTo: string | null) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const client = useQueryClient();
  const navigate = useNavigate();
  const started = useRef(false);
  const deletion = useMutation({
    mutationFn: deleteExistingEntity,
    onSuccess: async (_result, deletedId) => {
      await invalidateDeletedEntity(client, deletedId);
      void navigate(safeEntityReturnTo(returnTo), { replace: true });
    }
  });
  const remove = () => {
    if (!entity || deletion.isPending || started.current) return;
    deletion.reset();
    modal.confirm({
      title: t('entity.delete.title', { name: entity.displayName || entity.name }),
      content: t('entity.delete.description'),
      okText: t('entity.delete.action'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        if (started.current) return;
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
  if (error) return { kind: classifyEntityDetailError(error) };
  return detail ? { kind: 'ready', detail } : { kind: 'error' };
}

function parseEntityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
