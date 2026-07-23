/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  classifyEntityDefinitionError,
  loadEntityDefinition,
  previewEntityDefinition,
  saveEntityDefinition
} from '../api/entity-definition-api';
import { loadEditableEntity } from '../api/entity-editor-api';
import type { EditableEntityDto } from '../model/entity-editor-contract';
import {
  canSaveEntityDefinition,
  changeEntityDefinitionContent,
  parseEntityDefinitionId,
  previewedEntityDefinition,
  resetEntityDefinitionDraft,
  safeEntityDefinitionReturnTo,
  type EntityDefinitionDraft,
  type EntityDefinitionFailure,
  type EntityDefinitionFormat,
  type EntityDefinitionViewModel
} from '../model/entity-definition-model';
import { entityQueryKeys } from './entity-query-keys';

export function useEntityDefinitionController(): EntityDefinitionViewModel {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const id = parseEntityDefinitionId(entityId);
  const [format, setFormat] = useState<EntityDefinitionFormat>('yaml');
  const context = useQuery({
    queryKey: entityQueryKeys.editor(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadEditableEntity(id, signal),
    retry: false
  });
  const definition = useQuery({
    queryKey: entityQueryKeys.definition(id, format),
    queryFn: id === undefined ? skipToken : ({ signal }) => loadEntityDefinition(id, format, signal),
    retry: false
  });
  const source = `${id ?? 'missing'}:${format}`;
  const editing = useDefinitionEditing({
    id,
    format,
    setFormat,
    source,
    canonical: definition.data,
    refetch: () => definition.refetch({ throwOnError: true }),
    client
  });
  const evidence = resolveDefinitionEvidence(id, context, definition, editing.state.saved);
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

type DefinitionEditingOptions = {
  id: number | undefined;
  format: EntityDefinitionFormat;
  setFormat: (format: EntityDefinitionFormat) => void;
  source: string;
  canonical: string | undefined;
  refetch: () => Promise<unknown>;
  client: ReturnType<typeof useQueryClient>;
};

function useDefinitionEditing(options: DefinitionEditingOptions) {
  const { id, format, setFormat, source, canonical, refetch, client } = options;
  const [edited, setEdited] = useState<{ source: string; draft: EntityDefinitionDraft }>();
  const draft = currentDraft(edited, source, id, format, canonical);
  const dirty = Boolean(draft && draft.content !== draft.canonical);
  const [failure, setFailure] = useState<EntityDefinitionFailure>();
  const [refreshFailure, setRefreshFailure] = useState<EntityDefinitionFailure>();
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Refs close same-tick gaps before React exposes pending state; save remains irreversible until settled.
  const revision = useRef(0);
  const previewLock = useRef(false);
  const saveLock = useRef(false);
  const refreshLock = useRef(false);
  const replaceDraft = (next: EntityDefinitionDraft) => {
    if (saveLock.current || refreshFailure) return;
    revision.current += 1;
    setEdited({ source, draft: next });
    setFailure(undefined);
    setRefreshFailure(undefined);
    setSaved(false);
  };
  const changeFormat = (next: EntityDefinitionFormat) => {
    if (saveLock.current || refreshFailure || next === format) return;
    if (dirty) return;
    revision.current += 1;
    setEdited(undefined);
    setFailure(undefined);
    setRefreshFailure(undefined);
    setSaved(false);
    setFormat(next);
  };
  const preview = async () => {
    if (!draft?.content.trim() || id === undefined || previewLock.current || saveLock.current || refreshFailure) return;
    const requestedRevision = revision.current;
    previewLock.current = true;
    setPreviewing(true);
    setFailure(undefined);
    try {
      const value = await previewEntityDefinition(id, { content: draft.content, format });
      if (revision.current === requestedRevision) setEdited({ source, draft: previewedEntityDefinition(draft, value) });
    } catch (error) {
      if (revision.current === requestedRevision) setFailure(classifyEntityDefinitionError(error));
    } finally {
      previewLock.current = false;
      setPreviewing(false);
    }
  };
  const persistence = {
    id,
    format,
    source,
    draft,
    client,
    refetch,
    setEdited,
    setFailure,
    setRefreshFailure,
    setSaved,
    setSaving,
    setRefreshing,
    previewLock,
    saveLock,
    refreshLock
  };
  return {
    state: {
      content: draft?.content ?? '',
      dirty,
      ...(draft?.preview ? { preview: draft.preview } : {}),
      previewing,
      saving,
      refreshing,
      saveEnabled: canSaveEntityDefinition(draft, id) && !previewing && !saving,
      ...(failure ? { failure } : {}),
      ...(refreshFailure ? { refreshFailure } : {}),
      saved
    },
    actions: {
      changeContent: (content: string) => draft && replaceDraft(changeEntityDefinitionContent(draft, content)),
      changeFormat,
      reset: () => id !== undefined && draft && replaceDraft(resetEntityDefinitionDraft(id, format, draft.canonical)),
      preview: () => void preview(),
      save: () => void persistDefinition(persistence)
    },
    clearFailure: () => {
      setFailure(undefined);
      setRefreshFailure(undefined);
    },
    retryRefresh: () => void retryCommittedDefinition(persistence),
    canLeave: () => !saveLock.current
  };
}

type DefinitionPersistence = {
  id: number | undefined;
  format: EntityDefinitionFormat;
  source: string;
  draft: EntityDefinitionDraft | undefined;
  client: ReturnType<typeof useQueryClient>;
  refetch: () => Promise<unknown>;
  setEdited: (value: { source: string; draft: EntityDefinitionDraft } | undefined) => void;
  setFailure: (value: EntityDefinitionFailure | undefined) => void;
  setRefreshFailure: (value: EntityDefinitionFailure | undefined) => void;
  setSaved: (value: boolean) => void;
  setSaving: (value: boolean) => void;
  setRefreshing: (value: boolean) => void;
  previewLock: { current: boolean };
  saveLock: { current: boolean };
  refreshLock: { current: boolean };
};

async function persistDefinition(options: DefinitionPersistence) {
  const { id, draft, format, previewLock, saveLock } = options;
  if (!canSaveEntityDefinition(draft, id) || id === undefined || previewLock.current || saveLock.current) return;
  saveLock.current = true;
  options.setSaving(true);
  options.setFailure(undefined);
  try {
    await saveEntityDefinition(id, { content: draft!.content, format });
  } catch (error) {
    options.setFailure(classifyEntityDefinitionError(error));
    saveLock.current = false;
    options.setSaving(false);
    return;
  }
  options.setEdited({ source: options.source, draft: resetEntityDefinitionDraft(id, format, draft!.content) });
  options.setSaved(true);
  options.setRefreshFailure(undefined);
  try {
    await refreshSavedDefinition(options.client, options.refetch, id);
    options.setEdited(undefined);
  } catch (error) {
    options.setRefreshFailure(classifyEntityDefinitionError(error));
  } finally {
    saveLock.current = false;
    options.setSaving(false);
  }
}

async function retryCommittedDefinition(options: DefinitionPersistence) {
  if (options.refreshLock.current) return;
  options.refreshLock.current = true;
  options.setRefreshing(true);
  try {
    await options.refetch();
    options.setEdited(undefined);
    options.setRefreshFailure(undefined);
  } catch (error) {
    options.setRefreshFailure(classifyEntityDefinitionError(error));
  } finally {
    options.refreshLock.current = false;
    options.setRefreshing(false);
  }
}

function currentDraft(
  edited: { source: string; draft: EntityDefinitionDraft } | undefined,
  source: string,
  id: number | undefined,
  format: EntityDefinitionFormat,
  canonical: string | undefined
) {
  if (edited?.source === source) return edited.draft;
  return id !== undefined && canonical !== undefined ? resetEntityDefinitionDraft(id, format, canonical) : undefined;
}

function resolveDefinitionEvidence(
  id: number | undefined,
  context: { isPending: boolean; error: Error | null; data: EditableEntityDto | undefined },
  definition: { isPending: boolean; error: Error | null; data: string | undefined },
  hasCommittedDraft: boolean
): EntityDefinitionViewModel['state']['evidence'] {
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
