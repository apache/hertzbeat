/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { App } from 'antd';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { monitorDefinitionWorkspaceIsDirty, type MonitorDefinitionWorkspace } from '../model/monitor-definition-model';

/** Cross-route guard; definition selection keeps its existing workspace-owned guard. */
export function useMonitorDefinitionUnsavedNavigation(workspace: MonitorDefinitionWorkspace | null) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const dirty = monitorDefinitionWorkspaceIsDirty(workspace);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [dirty]
    )
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
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
}
