/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  classifyEntityDefinitionError,
  previewEntityDefinition,
  saveEntityDefinition
} from '../api/entity-definition-api';
import {
  canSaveEntityDefinition,
  previewedEntityDefinition,
  resetEntityDefinitionDraft,
  type EntityDefinitionDraft,
  type EntityDefinitionFormat
} from '../model/entity-definition-model';
import type { EntityDefinitionEditingRuntime } from './entity-definition-editing-state';

export function createDefinitionPreviewAction(session: EntityDefinitionEditingRuntime) {
  return () => void runPreview(session);
}

async function runPreview(session: EntityDefinitionEditingRuntime) {
  const admission = admitDefinitionPreview(session);
  if (!admission) return;
  try {
    if (!session.write.current(admission.owner)) return;
    const value = await previewEntityDefinition(admission.id, admission.request);
    acceptDefinitionPreview(session, admission, value);
  } catch (error) {
    rejectDefinitionPreview(session, admission, error);
  } finally {
    finishDefinitionPreview(session, admission.owner);
  }
}

type DefinitionPreviewAdmission = {
  owner: number;
  id: number;
  request: { content: string; format: EntityDefinitionFormat };
  draft: EntityDefinitionDraft;
  revision: number;
};

function admitDefinitionPreview(session: EntityDefinitionEditingRuntime): DefinitionPreviewAdmission | undefined {
  const { draft, options, locks, state } = session;
  if (
    !draft?.content.trim() ||
    options.id === undefined ||
    locks.preview !== undefined ||
    locks.save !== undefined ||
    state.refreshFailure
  )
    return;
  const owner = session.write.admit();
  if (owner === undefined) return;
  locks.preview = owner;
  session.patch({ previewing: true, failure: undefined });
  return {
    owner,
    id: options.id,
    request: { content: draft.content, format: options.format },
    draft,
    revision: locks.revision
  };
}

function acceptDefinitionPreview(
  session: EntityDefinitionEditingRuntime,
  admission: DefinitionPreviewAdmission,
  value: NonNullable<EntityDefinitionDraft['preview']>
) {
  if (!session.write.current(admission.owner) || session.locks.revision !== admission.revision) return;
  session.patch({
    edited: {
      source: session.source,
      draft: previewedEntityDefinition(admission.draft, value)
    }
  });
}

function rejectDefinitionPreview(
  session: EntityDefinitionEditingRuntime,
  admission: DefinitionPreviewAdmission,
  error: unknown
) {
  if (!session.write.current(admission.owner) || session.locks.revision !== admission.revision) return;
  session.patch({ failure: classifyEntityDefinitionError(error) });
}

function finishDefinitionPreview(session: EntityDefinitionEditingRuntime, owner: number) {
  if (session.locks.preview !== owner) return;
  session.locks.preview = undefined;
  if (session.write.current(owner)) session.patch({ previewing: false });
}

export function createDefinitionSaveAction(session: EntityDefinitionEditingRuntime) {
  return () => void runSave(session);
}

async function runSave(session: EntityDefinitionEditingRuntime) {
  const admission = admitDefinitionSave(session);
  if (!admission) return;
  try {
    if (!session.write.current(admission.owner)) return;
    await saveEntityDefinition(admission.id, admission.request);
  } catch (error) {
    rejectDefinitionSave(session, admission.owner, error);
    return;
  }
  if (!session.write.current(admission.owner)) return;
  acceptDefinitionSave(session, admission);
  await refreshAcceptedDefinition(session, admission);
}

type DefinitionSaveAdmission = {
  owner: number;
  id: number;
  request: { content: string; format: EntityDefinitionFormat };
  draft: EntityDefinitionDraft;
};

function admitDefinitionSave(session: EntityDefinitionEditingRuntime): DefinitionSaveAdmission | undefined {
  const { draft, options, locks } = session;
  if (
    !canSaveEntityDefinition(draft, options.id) ||
    options.id === undefined ||
    locks.preview !== undefined ||
    locks.save !== undefined
  )
    return;
  const owner = session.write.admit();
  if (owner === undefined || !draft) return;
  locks.save = owner;
  session.patch({ saving: true, failure: undefined });
  return {
    owner,
    id: options.id,
    request: { content: draft.content, format: options.format },
    draft
  };
}

function rejectDefinitionSave(session: EntityDefinitionEditingRuntime, owner: number, error: unknown) {
  if (session.locks.save !== owner) return;
  session.locks.save = undefined;
  if (session.write.current(owner)) {
    session.patch({ failure: classifyEntityDefinitionError(error), saving: false });
  }
}

function acceptDefinitionSave(session: EntityDefinitionEditingRuntime, admission: DefinitionSaveAdmission) {
  session.patch({
    edited: {
      source: session.source,
      draft: resetEntityDefinitionDraft(admission.id, admission.request.format, admission.draft.content)
    },
    saved: true,
    refreshFailure: undefined
  });
}

async function refreshAcceptedDefinition(session: EntityDefinitionEditingRuntime, admission: DefinitionSaveAdmission) {
  try {
    await session.options.refreshAfterSave(admission.id);
    if (session.write.current(admission.owner)) session.patch({ edited: undefined });
  } catch (error) {
    if (session.write.current(admission.owner)) {
      session.patch({ refreshFailure: classifyEntityDefinitionError(error) });
    }
  } finally {
    finishDefinitionSaveRefresh(session, admission.owner);
  }
}

function finishDefinitionSaveRefresh(session: EntityDefinitionEditingRuntime, owner: number) {
  if (session.locks.save !== owner) return;
  session.locks.save = undefined;
  if (session.write.current(owner)) session.patch({ saving: false });
}

export function createDefinitionRefreshAction(session: EntityDefinitionEditingRuntime) {
  return () => {
    if (session.locks.refresh !== undefined) return;
    const owner = session.write.admit();
    if (owner === undefined) return;
    session.locks.refresh = owner;
    session.patch({ refreshing: true });
    void session.options
      .refetchCanonical()
      .then(() => {
        if (session.write.current(owner)) session.patch({ edited: undefined, refreshFailure: undefined });
      })
      .catch(error => {
        if (session.write.current(owner)) session.patch({ refreshFailure: classifyEntityDefinitionError(error) });
      })
      .finally(() => {
        if (session.locks.refresh !== owner) return;
        session.locks.refresh = undefined;
        if (session.write.current(owner)) session.patch({ refreshing: false });
      });
  };
}
