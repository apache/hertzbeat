/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const returnTo = safeEntityImportReturnTo(params.get('returnTo'));
  const [draft, setDraft] = useState(initialEntityImportDraft);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<EntityImportFailure>();
  const [createdIds, setCreatedIds] = useState<number[]>();
  // Refs enforce same-tick safety: preview is discardable, while confirmation is an irreversible write boundary.
  const revision = useRef(0);
  const previewLock = useRef(false);
  const confirmLock = useRef(false);

  useEffect(() => {
    const canonical = new URLSearchParams({ returnTo });
    if (location.pathname === entityRoutePaths.import && params.toString() !== canonical.toString()) {
      setParams(canonical, { replace: true });
    }
  }, [location.pathname, params, returnTo, setParams]);

  const invalidate = (next: typeof draft) => {
    if (confirmLock.current) return;
    revision.current += 1;
    setDraft(next);
    setFailure(undefined);
    setCreatedIds(undefined);
  };
  const changeContent = (content: string) => invalidate(changeEntityImportContent(draft, content));
  const changeFormat = (format: EntityImportFormat) => invalidate(changeEntityImportFormat(draft, format));

  const preview = async () => {
    if (!draft.content.trim() || previewLock.current || confirmLock.current || confirming) return;
    const request = entityImportRequest(draft);
    const requestedRevision = revision.current;
    previewLock.current = true;
    setPreviewing(true);
    setFailure(undefined);
    try {
      const resources = await previewEntityDefinitionBundle(request);
      if (revision.current === requestedRevision) setDraft(current => previewedEntityImport(current, resources));
    } catch (error) {
      if (revision.current === requestedRevision) setFailure(classifyEntityImportError(error));
    } finally {
      previewLock.current = false;
      setPreviewing(false);
    }
  };

  const confirm = async () => {
    if (!canConfirmEntityImport(draft) || confirmLock.current || previewLock.current || previewing) return;
    const request = entityImportRequest(draft);
    const count = draft.preview?.length ?? 0;
    confirmLock.current = true;
    setConfirming(true);
    setFailure(undefined);
    try {
      const ids = await commitEntityDefinitionBundle(request, count);
      void client.invalidateQueries({ queryKey: entityQueryKeys.lists(), refetchType: 'none' });
      setCreatedIds(ids);
    } catch (error) {
      setFailure(classifyEntityImportError(error));
    } finally {
      confirmLock.current = false;
      setConfirming(false);
    }
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
      preview: () => void preview(),
      confirm: () => void confirm(),
      cancel: () => {
        if (!confirmLock.current) void navigate(returnTo);
      }
    }
  };
}
