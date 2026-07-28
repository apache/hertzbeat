/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';

import {
  canSaveEntityDefinition,
  changeEntityDefinitionContent,
  currentEntityDefinitionDraft,
  resetEntityDefinitionDraft,
  type EntityDefinitionDraft,
  type EntityDefinitionFormat,
  type EntityDefinitionViewModel
} from '../model/entity-definition-model';
import {
  initialEntityDefinitionEditingSession,
  retireEntityDefinitionEditing,
  type EntityDefinitionEditingOptions,
  type EntityDefinitionEditingRuntime,
  type EntityDefinitionEditingSession
} from './entity-definition-editing-state';
import {
  createDefinitionPreviewAction,
  createDefinitionRefreshAction,
  createDefinitionSaveAction
} from './entity-definition-editing-commands';
import { useEntityWriteBoundary } from './use-entity-capabilities';

type EditingResult = {
  state: Omit<EntityDefinitionViewModel['state'], 'evidence' | 'format'>;
  actions: Omit<EntityDefinitionViewModel['actions'], 'retry' | 'back'>;
  clearFailure: () => void;
  retryRefresh: () => void;
  canLeave: () => boolean;
};

export function useEntityDefinitionEditing(options: EntityDefinitionEditingOptions, canWrite: boolean): EditingResult {
  const [state, setState] = useState<EntityDefinitionEditingSession>(initialEntityDefinitionEditingSession);
  const source = `${options.id ?? 'missing'}:${options.format}`;
  const draft = currentEntityDefinitionDraft(state.edited, source, options.id, options.format, options.canonical);
  const [locks] = useState(() => ({
    revision: 0,
    preview: undefined,
    save: undefined,
    refresh: undefined
  }));
  const patch = (next: Partial<EntityDefinitionEditingSession>) => setState(current => ({ ...current, ...next }));
  const write = useEntityWriteBoundary(canWrite, () => retireEntityDefinitionEditing(locks, setState));
  const session = { options, state, source, draft, patch, locks, write };
  const draftActions = createDraftActions(session);
  return {
    state: projectDefinitionEditingState(canWrite, draft, state, options.id),
    actions: {
      ...draftActions,
      preview: createDefinitionPreviewAction(session),
      save: createDefinitionSaveAction(session)
    },
    clearFailure: () => patch({ failure: undefined, refreshFailure: undefined }),
    retryRefresh: createDefinitionRefreshAction(session),
    canLeave: () => locks.save === undefined
  };
}

function projectDefinitionEditingState(
  canWrite: boolean,
  draft: EntityDefinitionDraft | undefined,
  state: EntityDefinitionEditingSession,
  id: number | undefined
): EditingResult['state'] {
  const visibleDraft = canWrite ? draft : undefined;
  return {
    content: visibleDraft?.content ?? '',
    dirty: Boolean(visibleDraft && visibleDraft.content !== visibleDraft.canonical),
    ...(visibleDraft?.preview ? { preview: visibleDraft.preview } : {}),
    previewing: state.previewing,
    saving: state.saving,
    refreshing: state.refreshing,
    saveEnabled: canWrite && canSaveEntityDefinition(draft, id) && !state.previewing && !state.saving,
    canWrite,
    ...(state.failure ? { failure: state.failure } : {}),
    ...(state.refreshFailure ? { refreshFailure: state.refreshFailure } : {}),
    saved: state.saved
  };
}

function createDraftActions(session: EntityDefinitionEditingRuntime) {
  const replace = (draft: EntityDefinitionDraft) => {
    if (session.locks.save !== undefined || session.state.refreshFailure) return;
    session.locks.revision += 1;
    session.patch({
      edited: { source: session.source, draft },
      failure: undefined,
      refreshFailure: undefined,
      saved: false
    });
  };
  return {
    changeContent: (content: string) => session.draft && replace(changeEntityDefinitionContent(session.draft, content)),
    changeFormat: (format: EntityDefinitionFormat) => {
      if (session.locks.save !== undefined || session.state.refreshFailure || format === session.options.format) return;
      if (session.draft?.content !== session.draft?.canonical) return;
      session.locks.revision += 1;
      session.patch({ edited: undefined, failure: undefined, refreshFailure: undefined, saved: false });
      session.options.setFormat(format);
    },
    reset: () =>
      session.options.id !== undefined &&
      session.draft &&
      replace(resetEntityDefinitionDraft(session.options.id, session.options.format, session.draft.canonical))
  };
}
