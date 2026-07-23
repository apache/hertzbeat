/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';

import {
  classifyEntityDefinitionError,
  previewEntityDefinition,
  saveEntityDefinition
} from '../api/entity-definition-api';
import {
  canSaveEntityDefinition,
  changeEntityDefinitionContent,
  currentEntityDefinitionDraft,
  previewedEntityDefinition,
  resetEntityDefinitionDraft,
  type EntityDefinitionDraft,
  type EntityDefinitionFailure,
  type EntityDefinitionFormat,
  type EntityDefinitionViewModel
} from '../model/entity-definition-model';

type EditingOptions = {
  id: number | undefined;
  format: EntityDefinitionFormat;
  canonical: string | undefined;
  setFormat: (format: EntityDefinitionFormat) => void;
  refreshAfterSave: (id: number) => Promise<unknown>;
  refetchCanonical: () => Promise<unknown>;
};

type EditingSession = {
  edited: { source: string; draft: EntityDefinitionDraft } | undefined;
  failure: EntityDefinitionFailure | undefined;
  refreshFailure: EntityDefinitionFailure | undefined;
  saved: boolean;
  previewing: boolean;
  saving: boolean;
  refreshing: boolean;
};

type Session = {
  options: EditingOptions;
  state: EditingSession;
  source: string;
  draft: EntityDefinitionDraft | undefined;
  patch: (patch: Partial<EditingSession>) => void;
  locks: { revision: number; preview: boolean; save: boolean; refresh: boolean };
};

type EditingResult = {
  state: Omit<EntityDefinitionViewModel['state'], 'evidence' | 'format'>;
  actions: Omit<EntityDefinitionViewModel['actions'], 'retry' | 'back'>;
  clearFailure: () => void;
  retryRefresh: () => void;
  canLeave: () => boolean;
};

export function useEntityDefinitionEditing(options: EditingOptions): EditingResult {
  const [state, setState] = useState<EditingSession>({
    edited: undefined,
    failure: undefined,
    refreshFailure: undefined,
    saved: false,
    previewing: false,
    saving: false,
    refreshing: false
  });
  const source = `${options.id ?? 'missing'}:${options.format}`;
  const draft = currentEntityDefinitionDraft(state.edited, source, options.id, options.format, options.canonical);
  const [locks] = useState(() => ({ revision: 0, preview: false, save: false, refresh: false }));
  const patch = (next: Partial<EditingSession>) => setState(current => ({ ...current, ...next }));
  const session = { options, state, source, draft, patch, locks };
  const draftActions = createDraftActions(session);
  return {
    state: {
      content: draft?.content ?? '',
      dirty: Boolean(draft && draft.content !== draft.canonical),
      ...(draft?.preview ? { preview: draft.preview } : {}),
      previewing: state.previewing,
      saving: state.saving,
      refreshing: state.refreshing,
      saveEnabled: canSaveEntityDefinition(draft, options.id) && !state.previewing && !state.saving,
      ...(state.failure ? { failure: state.failure } : {}),
      ...(state.refreshFailure ? { refreshFailure: state.refreshFailure } : {}),
      saved: state.saved
    },
    actions: {
      ...draftActions,
      preview: createPreviewAction(session),
      save: createSaveAction(session)
    },
    clearFailure: () => patch({ failure: undefined, refreshFailure: undefined }),
    retryRefresh: createRefreshAction(session),
    canLeave: () => !locks.save
  };
}

function createDraftActions(session: Session) {
  const replace = (draft: EntityDefinitionDraft) => {
    if (session.locks.save || session.state.refreshFailure) return;
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
      if (session.locks.save || session.state.refreshFailure || format === session.options.format) return;
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

function createPreviewAction(session: Session) {
  return () => void runPreview(session);
}

async function runPreview(session: Session) {
  const { draft, options, locks, state } = session;
  if (!draft?.content.trim() || options.id === undefined || locks.preview || locks.save || state.refreshFailure) return;
  const requestedRevision = locks.revision;
  locks.preview = true;
  session.patch({ previewing: true, failure: undefined });
  try {
    const value = await previewEntityDefinition(options.id, { content: draft.content, format: options.format });
    if (locks.revision === requestedRevision)
      session.patch({ edited: { source: session.source, draft: previewedEntityDefinition(draft, value) } });
  } catch (error) {
    if (locks.revision === requestedRevision) session.patch({ failure: classifyEntityDefinitionError(error) });
  } finally {
    locks.preview = false;
    session.patch({ previewing: false });
  }
}

function createSaveAction(session: Session) {
  return () => void runSave(session);
}

async function runSave(session: Session) {
  const { draft, options, locks } = session;
  if (!canSaveEntityDefinition(draft, options.id) || options.id === undefined || locks.preview || locks.save) return;
  locks.save = true;
  session.patch({ saving: true, failure: undefined });
  try {
    await saveEntityDefinition(options.id, { content: draft!.content, format: options.format });
  } catch (error) {
    locks.save = false;
    session.patch({ failure: classifyEntityDefinitionError(error), saving: false });
    return;
  }
  session.patch({
    edited: {
      source: session.source,
      draft: resetEntityDefinitionDraft(options.id, options.format, draft!.content)
    },
    saved: true,
    refreshFailure: undefined
  });
  try {
    await options.refreshAfterSave(options.id);
    session.patch({ edited: undefined });
  } catch (error) {
    session.patch({ refreshFailure: classifyEntityDefinitionError(error) });
  } finally {
    locks.save = false;
    session.patch({ saving: false });
  }
}

function createRefreshAction(session: Session) {
  return () => {
    if (session.locks.refresh) return;
    session.locks.refresh = true;
    session.patch({ refreshing: true });
    void session.options
      .refetchCanonical()
      .then(() => session.patch({ edited: undefined, refreshFailure: undefined }))
      .catch(error => session.patch({ refreshFailure: classifyEntityDefinitionError(error) }))
      .finally(() => {
        session.locks.refresh = false;
        session.patch({ refreshing: false });
      });
  };
}
