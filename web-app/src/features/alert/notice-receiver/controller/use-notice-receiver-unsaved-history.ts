/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationType, useBlocker } from 'react-router-dom';

/** Query-only history keeps the modal mounted; only a history departure can lose its draft. */
export function useNoticeReceiverUnsavedHistory(dirty: boolean) {
  const { modal } = App.useApp();
  const { t } = useTranslation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation, historyAction }) =>
      dirty && historyAction === NavigationType.Pop && currentLocation.pathname !== nextLocation.pathname
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
