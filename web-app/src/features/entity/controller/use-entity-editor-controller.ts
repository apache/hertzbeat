/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { classifyEntityDetailError } from '../api/entity-api';
import {
  classifyEntityWriteError,
  loadEditableEntity,
  loadEntityCatalogSuggestions,
  saveEditableEntity
} from '../api/entity-editor-api';
import type { EditableEntityDto, EntityEditorDraft, EntityEditorField } from '../model/entity-editor-contract';
import {
  buildEntityCreatePayload,
  buildEntityUpdatePayload,
  emptyEntityEditorDraft,
  entityEditorDraftFrom,
  isEntityEditorDirty,
  validateEntityEditorDraft
} from '../model/entity-editor-model';
import {
  buildEntitySavedDetailPath,
  entityEditorListReturnTo,
  safeEntityEditorReturnTo
} from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';

export function useEntityEditorController(mode: 'new' | 'edit') {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { entityId } = useParams();
  const [params] = useSearchParams();
  const id = mode === 'edit' ? parseEntityId(entityId) : undefined;
  const { detail, suggestions } = useEditorResources(mode, id);
  const { initial, draft, setDraft, hydrated } = useEditorDraft(detail.data);
  const [errors, setErrors] = useState<ReturnType<typeof validateEntityEditorDraft>>({});
  const cancelTarget = safeEntityEditorReturnTo(params.get('returnTo'), id);
  const listReturnTo = entityEditorListReturnTo(cancelTarget);
  const save = useMutation({
    mutationFn: (payload: EditableEntityDto) => saveEditableEntity(mode, payload),
    onSuccess: async savedId => {
      await invalidateEntityEditorCaches(client, savedId);
      void navigate(buildEntitySavedDetailPath(savedId, listReturnTo));
    }
  });
  const change = (field: EntityEditorField, value: string) => {
    if (save.isPending) return;
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => withoutEditorError(current, field));
    save.reset();
  };
  const submit = () => {
    const nextErrors = validateEntityEditorDraft(draft);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || save.isPending) return;
    const payload = mode === 'new' ? buildEntityCreatePayload(draft) : buildEditPayload(detail.data, draft);
    if (payload) save.mutate(payload);
  };
  const cancel = () => {
    if (save.isPending) return;
    if (!isEntityEditorDirty(initial, draft)) return void navigate(cancelTarget);
    confirmDiscard(modal, t, () => navigate(cancelTarget));
  };
  return {
    state: {
      mode,
      evidence: resolveEditorEvidence(mode, id, detail.isPending, detail.error, detail.data, hydrated),
      suggestions: resolveSuggestions(suggestions.error, suggestions.data),
      draft,
      dirty: isEntityEditorDirty(initial, draft),
      errors,
      saving: save.isPending,
      ...(save.error ? { saveFailure: classifyEntityWriteError(save.error) } : {})
    },
    actions: { change, submit, cancel }
  };
}

function invalidateEntityEditorCaches(client: ReturnType<typeof useQueryClient>, id: number) {
  return Promise.all([
    client.invalidateQueries({ queryKey: entityQueryKeys.lists(), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.details(), refetchType: 'none' }),
    client.invalidateQueries({ queryKey: entityQueryKeys.editor(id), refetchType: 'none' })
  ]);
}

function useEditorResources(mode: 'new' | 'edit', id: number | undefined) {
  const detail = useQuery({
    queryKey: entityQueryKeys.editor(id),
    queryFn: mode === 'edit' && id ? ({ signal }) => loadEditableEntity(id, signal) : skipToken,
    retry: false
  });
  const suggestions = useQuery({
    queryKey: entityQueryKeys.suggestions(),
    queryFn: ({ signal }) => loadEntityCatalogSuggestions(signal),
    retry: false
  });
  return { detail, suggestions };
}

function useEditorDraft(detail: EditableEntityDto | undefined) {
  const initial = useMemo(() => (detail ? entityEditorDraftFrom(detail.entity) : emptyEntityEditorDraft), [detail]);
  const source = detail?.entity.id ?? 'new';
  const [edited, setEdited] = useState<{ source: number | 'new'; draft: EntityEditorDraft }>();
  const draft = edited?.source === source ? edited.draft : initial;
  const setDraft = (update: (current: EntityEditorDraft) => EntityEditorDraft) => {
    setEdited(current => ({ source, draft: update(current?.source === source ? current.draft : initial) }));
  };
  return { initial, draft, setDraft, hydrated: detail !== undefined };
}

function withoutEditorError(errors: ReturnType<typeof validateEntityEditorDraft>, field: EntityEditorField) {
  const next = { ...errors };
  delete next[field];
  return next;
}

function resolveSuggestions(
  error: Error | null,
  data: Awaited<ReturnType<typeof loadEntityCatalogSuggestions>> | undefined
) {
  if (error) return { kind: 'unavailable' } as const;
  return data ? ({ kind: 'ready', value: data } as const) : ({ kind: 'loading' } as const);
}

function confirmDiscard(
  modal: ReturnType<typeof App.useApp>['modal'],
  t: (key: string) => string,
  onOk: () => unknown
) {
  modal.confirm({
    title: t('entity.editor.discardConfirm'),
    okText: t('entity.editor.discardAction'),
    cancelText: t('common.cancel'),
    onOk
  });
}

function buildEditPayload(original: EditableEntityDto | undefined, draft: EntityEditorDraft) {
  return original ? buildEntityUpdatePayload(original, draft) : undefined;
}

function resolveEditorEvidence(
  mode: 'new' | 'edit',
  id: number | undefined,
  pending: boolean,
  error: Error | null,
  data: EditableEntityDto | undefined,
  hydrated: boolean
) {
  if (mode === 'new') return { kind: 'ready' } as const;
  if (!id) return { kind: 'missing' } as const;
  if (pending) return { kind: 'loading' } as const;
  if (error) return { kind: classifyEntityDetailError(error) } as const;
  return data ? ({ kind: hydrated ? 'ready' : 'loading' } as const) : ({ kind: 'error' } as const);
}

function parseEntityId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}
