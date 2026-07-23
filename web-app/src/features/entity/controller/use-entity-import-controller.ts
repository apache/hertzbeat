/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { entityRoutePaths } from '@/shared/navigation/app-paths';

import {
  classifyEntityImportError,
  commitEntityDefinitionBundle,
  previewEntityDefinitionBundle
} from '../api/entity-import-api';
import {
  canConfirmEntityImport,
  changeEntityImportContent,
  changeEntityImportFormat,
  entityImportRequest,
  initialEntityImportDraft,
  previewedEntityImport,
  safeEntityImportReturnTo,
  type EntityImportFailure,
  type EntityImportFormat,
  type EntityImportViewModel
} from '../model/entity-import-model';
import { entityQueryKeys } from './entity-query-keys';

export function useEntityImportController(): EntityImportViewModel {
  const navigate = useNavigate();
  const client = useQueryClient();
  const returnTo = useCanonicalEntityImportReturnTo();
  const [draft, setDraft] = useState(initialEntityImportDraft);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<EntityImportFailure>();
  const [createdIds, setCreatedIds] = useState<number[]>();
  // Refs enforce same-tick safety: preview is discardable, while confirmation is an irreversible write boundary.
  const revision = useRef(0);
  const previewLock = useRef(false);
  const confirmLock = useRef(false);

  const invalidate = (next: typeof draft) => {
    if (confirmLock.current) return;
    revision.current += 1;
    setDraft(next);
    setFailure(undefined);
    setCreatedIds(undefined);
  };
  const changeContent = (content: string) => invalidate(changeEntityImportContent(draft, content));
  const changeFormat = (format: EntityImportFormat) => invalidate(changeEntityImportFormat(draft, format));
  const runtime = {
    revision,
    previewLock,
    confirmLock,
    setDraft,
    setPreviewing,
    setConfirming,
    setFailure,
    setCreatedIds
  };

  return {
    state: {
      draft,
      ...(draft.preview ? { preview: draft.preview } : {}),
      previewing,
      confirming,
      confirmEnabled: canConfirmEntityImport(draft) && !previewing && !confirming,
      ...(failure ? { failure } : {}),
      ...(createdIds ? { createdIds } : {}),
      returnTo
    },
    actions: {
      changeContent,
      changeFormat,
      preview: () => void previewImport(draft, confirming, runtime),
      confirm: () => void confirmImport(draft, previewing, client, runtime),
      cancel: () => {
        if (!confirmLock.current) void navigate(returnTo);
      }
    }
  };
}

type ImportRuntime = {
  revision: MutableRefObject<number>;
  previewLock: MutableRefObject<boolean>;
  confirmLock: MutableRefObject<boolean>;
  setDraft: Dispatch<SetStateAction<typeof initialEntityImportDraft>>;
  setPreviewing: Dispatch<SetStateAction<boolean>>;
  setConfirming: Dispatch<SetStateAction<boolean>>;
  setFailure: Dispatch<SetStateAction<EntityImportFailure | undefined>>;
  setCreatedIds: Dispatch<SetStateAction<number[] | undefined>>;
};

function useCanonicalEntityImportReturnTo() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const returnTo = safeEntityImportReturnTo(params.get('returnTo'));
  useEffect(() => {
    const canonical = new URLSearchParams({ returnTo });
    if (location.pathname === entityRoutePaths.import && params.toString() !== canonical.toString()) {
      setParams(canonical, { replace: true });
    }
  }, [location.pathname, params, returnTo, setParams]);
  return returnTo;
}

async function previewImport(draft: typeof initialEntityImportDraft, confirming: boolean, runtime: ImportRuntime) {
  if (!draft.content.trim() || runtime.previewLock.current || runtime.confirmLock.current || confirming) return;
  const request = entityImportRequest(draft);
  const requestedRevision = runtime.revision.current;
  runtime.previewLock.current = true;
  runtime.setPreviewing(true);
  runtime.setFailure(undefined);
  try {
    const resources = await previewEntityDefinitionBundle(request);
    if (runtime.revision.current === requestedRevision) {
      runtime.setDraft(current => previewedEntityImport(current, resources));
    }
  } catch (error) {
    if (runtime.revision.current === requestedRevision) runtime.setFailure(classifyEntityImportError(error));
  } finally {
    runtime.previewLock.current = false;
    runtime.setPreviewing(false);
  }
}

async function confirmImport(
  draft: typeof initialEntityImportDraft,
  previewing: boolean,
  client: QueryClient,
  runtime: ImportRuntime
) {
  if (!canConfirmEntityImport(draft) || runtime.confirmLock.current || runtime.previewLock.current || previewing)
    return;
  const request = entityImportRequest(draft);
  const count = draft.preview?.length ?? 0;
  runtime.confirmLock.current = true;
  runtime.setConfirming(true);
  runtime.setFailure(undefined);
  try {
    const ids = await commitEntityDefinitionBundle(request, count);
    void client.invalidateQueries({ queryKey: entityQueryKeys.lists(), refetchType: 'none' });
    runtime.setCreatedIds(ids);
  } catch (error) {
    runtime.setFailure(classifyEntityImportError(error));
  } finally {
    runtime.confirmLock.current = false;
    runtime.setConfirming(false);
  }
}
