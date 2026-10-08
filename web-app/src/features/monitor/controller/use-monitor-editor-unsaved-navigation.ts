/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { App } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';

export function useMonitorEditorUnsavedNavigation(
  dirty: boolean,
  source: string,
  draft: MonitorEditorDraft | undefined
) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const saved = useRef(false);
  useLayoutEffect(() => {
    saved.current = false;
  }, [source, draft]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname;
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
    // An acknowledged save or explicit Cancel already owns its navigation.
    if (saved.current) return;
    if (!dirty) {
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
    allow: () => {
      // Explicit Cancel and an acknowledged save own their departure.
      saved.current = true;
    }
  };
}
