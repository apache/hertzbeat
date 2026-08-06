/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TFunction } from 'i18next';

type ConfirmationApi = {
  confirm: (options: { title: string; okText: string; cancelText: string; onOk: () => unknown }) => unknown;
};

export function confirmUnsavedNavigation(modal: ConfirmationApi, t: TFunction, onConfirm: () => unknown) {
  modal.confirm({
    title: t('common.unsavedChangesConfirm'),
    okText: t('common.discardChanges'),
    cancelText: t('common.cancel'),
    onOk: onConfirm
  });
}
