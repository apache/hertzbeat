/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { entityRoutePaths } from '@/shared/navigation/app-paths';

import {
  canConfirmEntityImport,
  changeEntityImportContent,
  changeEntityImportFormat,
  initialEntityImportDraft,
  safeEntityImportReturnTo,
  type EntityImportFailure,
  type EntityImportFormat,
  type EntityImportViewModel
} from '../model/entity-import-model';
import {
  runEntityImportConfirmation,
  runEntityImportPreview,
  type EntityImportRuntime
} from './entity-import-commands';
import { useEntityCapabilities, useEntityWriteBoundary } from './use-entity-capabilities';

export function useEntityImportController(): EntityImportViewModel {
  const navigate = useNavigate();
  const client = useQueryClient();
  const returnTo = useCanonicalEntityImportReturnTo();
  const [draft, setDraft] = useState(initialEntityImportDraft);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<EntityImportFailure>();
  const [createdIds, setCreatedIds] = useState<number[]>();
  // Owner generations provide same-tick exclusion without letting a retired request unlock its replacement.
  const revision = useRef(0);
  const previewLock = useRef<number | undefined>(undefined);
  const confirmLock = useRef<number | undefined>(undefined);
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
  const { canWrite } = useEntityCapabilities();
  const write = useEntityWriteBoundary(canWrite, () => retireImport(runtime));

  const invalidate = (next: typeof draft) => {
    if (!canWrite || confirmLock.current !== undefined) return;
    revision.current += 1;
    setDraft(next);
    setFailure(undefined);
    setCreatedIds(undefined);
  };
  const changeContent = (content: string) => invalidate(changeEntityImportContent(draft, content));
  const changeFormat = (format: EntityImportFormat) => invalidate(changeEntityImportFormat(draft, format));
  return {
    state: {
      draft,
      ...(draft.preview ? { preview: draft.preview } : {}),
      previewing,
      confirming,
      confirmEnabled: canWrite && canConfirmEntityImport(draft) && !previewing && !confirming,
      canWrite,
      ...(failure ? { failure } : {}),
      ...(createdIds ? { createdIds } : {}),
      returnTo
    },
    actions: {
      changeContent,
      changeFormat,
      preview: () => void runEntityImportPreview(draft, confirming, runtime, write),
      confirm: () => void runEntityImportConfirmation(draft, previewing, client, runtime, write),
      cancel: () => {
        if (confirmLock.current === undefined) void navigate(returnTo);
      }
    }
  };
}

function retireImport(runtime: EntityImportRuntime) {
  runtime.revision.current += 1;
  runtime.previewLock.current = undefined;
  runtime.confirmLock.current = undefined;
  runtime.setDraft(initialEntityImportDraft);
  runtime.setPreviewing(false);
  runtime.setConfirming(false);
  runtime.setFailure(undefined);
  runtime.setCreatedIds(undefined);
}

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
