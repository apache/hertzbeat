/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { classifyEntityDefinitionError, loadEntityDefinition } from '../api/entity-definition-api';
import { loadEditableEntity } from '../api/entity-editor-api';
import type { EditableEntityDto } from '../model/entity-editor-contract';
import {
  parseEntityDefinitionId,
  safeEntityDefinitionReturnTo,
  type EntityDefinitionFormat,
  type EntityDefinitionViewModel
} from '../model/entity-definition-model';
import { entityQueryKeys } from './entity-query-keys';
import { useEntityDefinitionEditing } from './use-entity-definition-editing';
import { useEntityCapabilities } from './use-entity-capabilities';

export function useEntityDefinitionController(): EntityDefinitionViewModel {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const id = parseEntityDefinitionId(entityId);
  const { canWrite } = useEntityCapabilities();
  const [format, setFormat] = useState<EntityDefinitionFormat>('yaml');
  const context = useQuery({
    queryKey: entityQueryKeys.editor(id),
    queryFn: id === undefined || !canWrite ? skipToken : ({ signal }) => loadEditableEntity(id, signal),
    retry: false
  });
  const definition = useQuery({
    queryKey: entityQueryKeys.definition(id, format),
    queryFn: id === undefined || !canWrite ? skipToken : ({ signal }) => loadEntityDefinition(id, format, signal),
    retry: false
  });
  const editing = useEntityDefinitionEditing(
    {
      id,
      format,
      setFormat,
      canonical: definition.data,
      refetchCanonical: () => definition.refetch({ throwOnError: true }),
      refreshAfterSave: savedId =>
        refreshSavedDefinition(client, () => definition.refetch({ throwOnError: true }), savedId)
    },
    canWrite
  );
  const evidence = resolveDefinitionEvidence(canWrite, id, context, definition, editing.state.saved);
  return {
    state: {
      evidence,
      format,
      ...editing.state
    },
    actions: {
      ...editing.actions,
      retry: () => {
        if (editing.state.saved) {
          if (context.error) void context.refetch();
          void editing.retryRefresh();
          return;
        }
        editing.clearFailure();
        void context.refetch();
        void definition.refetch();
      },
      back: () => {
        if (editing.canLeave() && id !== undefined)
          void navigate(safeEntityDefinitionReturnTo(id, params.get('returnTo')));
      }
    }
  };
}

function resolveDefinitionEvidence(
  canWrite: boolean,
  id: number | undefined,
  context: { isPending: boolean; error: Error | null; data: EditableEntityDto | undefined },
  definition: { isPending: boolean; error: Error | null; data: string | undefined },
  hasCommittedDraft: boolean
): EntityDefinitionViewModel['state']['evidence'] {
  if (!canWrite) return { kind: 'permission' };
  if (id === undefined) return { kind: 'missing' };
  if (context.isPending || definition.isPending) return { kind: 'loading' };
  const error = context.error ?? (hasCommittedDraft ? null : definition.error);
  if (error) {
    const kind = classifyEntityDefinitionError(error).kind;
    return { kind: kind === 'validation' ? 'error' : kind };
  }
  return context.data && definition.data ? { kind: 'ready', resource: context.data } : { kind: 'error' };
}

async function refreshSavedDefinition(
  client: ReturnType<typeof useQueryClient>,
  refetch: () => Promise<unknown>,
  id: number
) {
  await Promise.all([
    client.invalidateQueries({ queryKey: entityQueryKeys.lists(), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.detail(id), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.editor(id), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.definitions(), refetchType: 'none' }),
    refetch()
  ]);
}
