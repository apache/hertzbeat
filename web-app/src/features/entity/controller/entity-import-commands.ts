/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import {
  classifyEntityImportError,
  commitEntityDefinitionBundle,
  previewEntityDefinitionBundle
} from '../api/entity-import-api';
import {
  canConfirmEntityImport,
  entityImportRequest,
  initialEntityImportDraft,
  previewedEntityImport,
  type EntityImportFailure
} from '../model/entity-import-model';
import { entityQueryKeys } from './entity-query-keys';

export type EntityImportRuntime = {
  revision: MutableRefObject<number>;
  previewLock: MutableRefObject<number | undefined>;
  confirmLock: MutableRefObject<number | undefined>;
  setDraft: Dispatch<SetStateAction<typeof initialEntityImportDraft>>;
  setPreviewing: Dispatch<SetStateAction<boolean>>;
  setConfirming: Dispatch<SetStateAction<boolean>>;
  setFailure: Dispatch<SetStateAction<EntityImportFailure | undefined>>;
  setCreatedIds: Dispatch<SetStateAction<number[] | undefined>>;
};

export type EntityImportWriteBoundary = {
  admit: () => number | undefined;
  current: (owner: number) => boolean;
};

export async function runEntityImportPreview(
  draft: typeof initialEntityImportDraft,
  confirming: boolean,
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary
) {
  const admission = admitImportPreview(draft, confirming, runtime, write);
  if (!admission) return;
  try {
    if (!write.current(admission.owner)) return;
    const resources = await previewEntityDefinitionBundle(admission.request);
    acceptImportPreview(runtime, write, admission, resources);
  } catch (error) {
    rejectImportPreview(runtime, write, admission, error);
  } finally {
    finishImportPreview(runtime, write, admission.owner);
  }
}

type ImportPreviewAdmission = {
  owner: number;
  request: ReturnType<typeof entityImportRequest>;
  revision: number;
};

function admitImportPreview(
  draft: typeof initialEntityImportDraft,
  confirming: boolean,
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary
): ImportPreviewAdmission | undefined {
  if (
    !draft.content.trim() ||
    runtime.previewLock.current !== undefined ||
    runtime.confirmLock.current !== undefined ||
    confirming
  )
    return;
  const owner = write.admit();
  if (owner === undefined) return;
  runtime.previewLock.current = owner;
  runtime.setPreviewing(true);
  runtime.setFailure(undefined);
  return { owner, request: entityImportRequest(draft), revision: runtime.revision.current };
}

function acceptImportPreview(
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary,
  admission: ImportPreviewAdmission,
  resources: Awaited<ReturnType<typeof previewEntityDefinitionBundle>>
) {
  if (!write.current(admission.owner) || runtime.revision.current !== admission.revision) return;
  runtime.setDraft(current => previewedEntityImport(current, resources));
}

function rejectImportPreview(
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary,
  admission: ImportPreviewAdmission,
  error: unknown
) {
  if (!write.current(admission.owner) || runtime.revision.current !== admission.revision) return;
  runtime.setFailure(classifyEntityImportError(error));
}

function finishImportPreview(runtime: EntityImportRuntime, write: EntityImportWriteBoundary, owner: number) {
  if (runtime.previewLock.current !== owner) return;
  runtime.previewLock.current = undefined;
  if (write.current(owner)) runtime.setPreviewing(false);
}

export async function runEntityImportConfirmation(
  draft: typeof initialEntityImportDraft,
  previewing: boolean,
  client: QueryClient,
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary
) {
  const admission = admitImportConfirmation(draft, previewing, runtime, write);
  if (!admission) return;
  try {
    if (!write.current(admission.owner)) return;
    const ids = await commitEntityDefinitionBundle(admission.request, admission.count);
    acceptImportConfirmation(client, runtime, write, admission.owner, ids);
  } catch (error) {
    if (write.current(admission.owner)) runtime.setFailure(classifyEntityImportError(error));
  } finally {
    finishImportConfirmation(runtime, write, admission.owner);
  }
}

type ImportConfirmationAdmission = {
  owner: number;
  request: ReturnType<typeof entityImportRequest>;
  count: number;
};

function admitImportConfirmation(
  draft: typeof initialEntityImportDraft,
  previewing: boolean,
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary
): ImportConfirmationAdmission | undefined {
  if (
    !canConfirmEntityImport(draft) ||
    runtime.confirmLock.current !== undefined ||
    runtime.previewLock.current !== undefined ||
    previewing
  )
    return;
  const owner = write.admit();
  if (owner === undefined) return;
  runtime.confirmLock.current = owner;
  runtime.setConfirming(true);
  runtime.setFailure(undefined);
  return { owner, request: entityImportRequest(draft), count: draft.preview?.length ?? 0 };
}

function acceptImportConfirmation(
  client: QueryClient,
  runtime: EntityImportRuntime,
  write: EntityImportWriteBoundary,
  owner: number,
  ids: number[]
) {
  if (!write.current(owner)) return;
  void client.invalidateQueries({ queryKey: entityQueryKeys.lists(), refetchType: 'none' });
  runtime.setCreatedIds(ids);
}

function finishImportConfirmation(runtime: EntityImportRuntime, write: EntityImportWriteBoundary, owner: number) {
  if (runtime.confirmLock.current !== owner) return;
  runtime.confirmLock.current = undefined;
  if (write.current(owner)) runtime.setConfirming(false);
}
