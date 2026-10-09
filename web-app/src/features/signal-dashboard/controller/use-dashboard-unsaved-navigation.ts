/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { App } from 'antd';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import type { DashboardEditor } from '../model/signal-dashboard-editor-model';
import { readSignalDashboard } from '../model/signal-dashboard-record';

export function useDashboardUnsavedNavigation(draft: DashboardEditor | undefined) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const saved = useRef(false);
  const dirty = isDirty(draft);
  useLayoutEffect(() => {
    saved.current = false;
  }, [draft]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const leavesDraft =
      currentLocation.pathname !== nextLocation.pathname ||
      new URLSearchParams(currentLocation.search).get('dashboard') !==
        new URLSearchParams(nextLocation.search).get('dashboard');
    return dirty && !saved.current && leavesDraft;
  });
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty && !saved.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty]
    )
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (!dirty || saved.current) {
      blocker.proceed();
      return;
    }
    let active = true;
    const resolve = (action: () => void) => {
      if (!active) return;
      active = false;
      action();
    };
    const confirmation = modal.confirm({
      title: t('common.unsavedChangesConfirm'),
      okText: t('common.discardChanges'),
      cancelText: t('common.cancel'),
      onOk: () => resolve(blocker.proceed),
      onCancel: () => resolve(blocker.reset)
    });
    return () => {
      active = false;
      confirmation.destroy();
    };
  }, [blocker, dirty, modal, t]);
  return {
    saved: () => {
      // Save may navigate to a new dashboard identity before the cleared draft renders.
      saved.current = true;
    }
  };
}

function isDirty(draft: DashboardEditor | undefined) {
  if (!draft) return false;
  if (draft.mode !== 'edit' || !draft.original) return true;
  const original = readSignalDashboard(draft.original);
  return original.kind !== 'document' || !isEqual(original.document, draft.document);
}
