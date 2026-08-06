/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { entityRoutePaths } from '@/shared/navigation/app-paths';
import { confirmUnsavedNavigation } from '@/shared/navigation/confirm-unsaved-navigation';

import {
  canConfirmEntityImport,
  changeEntityImportContent,
  changeEntityImportFormat,
  initialEntityImportDraft,
  isEntityImportDirty,
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
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const client = useQueryClient();
  const returnTo = useCanonicalEntityImportReturnTo();
  const importState = useEntityImportState();
  const { draft, runtime } = importState;
  const { revision: revisionRef, confirmLock: confirmLockRef, setDraft, setFailure, setCreatedIds } = runtime;
  const { canWrite } = useEntityCapabilities();
  const write = useEntityWriteBoundary(canWrite, () => retireImport(runtime));

  const invalidate = (next: typeof draft) => {
    if (!canWrite || confirmLockRef.current !== undefined) return;
    revisionRef.current += 1;
    setDraft(next);
    setFailure(undefined);
    setCreatedIds(undefined);
  };
  const changeContent = (content: string) => invalidate(changeEntityImportContent(draft, content));
  const changeFormat = (format: EntityImportFormat) => invalidate(changeEntityImportFormat(draft, format));
  return useEntityImportViewModel({
    canWrite,
    changeContent,
    changeFormat,
    client,
    draft,
    modal,
    navigate,
    returnTo,
    runtime,
    state: importState,
    t,
    write
  });
}

function useEntityImportState() {
  const [draft, setDraft] = useState(initialEntityImportDraft);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<EntityImportFailure>();
  const [createdIds, setCreatedIds] = useState<number[]>();
  // Owner generations provide same-tick exclusion without letting a retired request unlock its replacement.
  const revision = useRef(0);
  const previewLock = useRef<number | undefined>(undefined);
  const confirmLock = useRef<number | undefined>(undefined);
  const runtime: EntityImportRuntime = {
    revision,
    previewLock,
    confirmLock,
    setDraft,
    setPreviewing,
    setConfirming,
    setFailure,
    setCreatedIds
  };
  return { draft, previewing, confirming, failure, createdIds, runtime };
}

function useEntityImportViewModel(input: {
  canWrite: boolean;
  changeContent: (content: string) => void;
  changeFormat: (format: EntityImportFormat) => void;
  client: ReturnType<typeof useQueryClient>;
  draft: ReturnType<typeof useEntityImportState>['draft'];
  modal: ReturnType<typeof App.useApp>['modal'];
  navigate: ReturnType<typeof useNavigate>;
  returnTo: string;
  runtime: EntityImportRuntime;
  state: ReturnType<typeof useEntityImportState>;
  t: ReturnType<typeof useTranslation>['t'];
  write: ReturnType<typeof useEntityWriteBoundary>;
}): EntityImportViewModel {
  const { canWrite, client, draft, modal, navigate, returnTo, runtime, state, t, write } = input;
  return {
    state: {
      draft,
      ...(draft.preview ? { preview: draft.preview } : {}),
      previewing: state.previewing,
      confirming: state.confirming,
      confirmEnabled: canWrite && canConfirmEntityImport(draft) && !state.previewing && !state.confirming,
      canWrite,
      ...(state.failure ? { failure: state.failure } : {}),
      ...(state.createdIds ? { createdIds: state.createdIds } : {}),
      returnTo
    },
    actions: {
      changeContent: input.changeContent,
      changeFormat: input.changeFormat,
      preview: () => void runEntityImportPreview(draft, state.confirming, runtime, write),
      confirm: () => void runEntityImportConfirmation(draft, state.previewing, client, runtime, write),
      cancel: () => {
        if (runtime.confirmLock.current !== undefined) return;
        if (!isEntityImportDirty(draft)) return void navigate(returnTo);
        confirmUnsavedNavigation(modal, t, () => {
          if (runtime.confirmLock.current === undefined) void navigate(returnTo);
        });
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
