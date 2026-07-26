/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertGroup } from '../model/alert-model';
import styles from '../shared/alert-center.module.css';

type BulkActions = {
  clear: () => void;
  remove: () => void | Promise<unknown>;
  reopen: () => void | Promise<unknown>;
  resolve: () => void | Promise<unknown>;
};

export function AlertCenterBulkActions({
  busy,
  selectedCount,
  actions
}: {
  busy: boolean;
  selectedCount: number;
  actions: BulkActions;
}) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;
  return (
    <div className={styles.bulkActions}>
      <Typography.Text>{t('alert.selected', { count: selectedCount })}</Typography.Text>
      <Space wrap size="small">
        <ConfirmedAction
          label={t('alert.resolveSelected')}
          confirm={t('alert.resolveSelectedConfirm', { count: selectedCount })}
          confirmLabel={t('alert.confirmResolve')}
          disabled={busy}
          run={actions.resolve}
        />
        <ConfirmedAction
          label={t('alert.reopenSelected')}
          confirm={t('alert.reopenSelectedConfirm', { count: selectedCount })}
          confirmLabel={t('alert.confirmReopen')}
          disabled={busy}
          run={actions.reopen}
        />
        <ConfirmedAction
          danger
          label={t('alert.deleteSelected')}
          confirm={t('alert.deleteSelectedConfirm', { count: selectedCount })}
          confirmLabel={t('alert.confirmDelete')}
          disabled={busy}
          run={actions.remove}
        />
        <Button size="small" disabled={busy} onClick={actions.clear}>
          {t('common.clear')}
        </Button>
      </Space>
    </div>
  );
}

export function AlertCenterRowActions({
  busy,
  group,
  remove,
  reopen,
  resolve
}: {
  busy: boolean;
  group: AlertGroup;
  remove: (group: AlertGroup) => void | Promise<unknown>;
  reopen: (group: AlertGroup) => void | Promise<unknown>;
  resolve: (group: AlertGroup) => void | Promise<unknown>;
}) {
  const { t } = useTranslation();
  const resolved = group.status === 'resolved';
  return (
    <Space size={0}>
      <ConfirmedAction
        type="link"
        label={t(resolved ? 'alert.reopen' : 'alert.resolve')}
        confirm={t(resolved ? 'alert.reopenConfirm' : 'alert.resolveConfirm')}
        confirmLabel={t(resolved ? 'alert.confirmReopen' : 'alert.confirmResolve')}
        disabled={busy}
        run={() => (resolved ? reopen(group) : resolve(group))}
      />
      <ConfirmedAction
        type="link"
        danger
        label={t('alert.delete')}
        confirm={t('alert.deleteConfirm')}
        confirmLabel={t('alert.confirmDelete')}
        disabled={busy}
        run={() => remove(group)}
      />
    </Space>
  );
}

function ConfirmedAction({
  confirm,
  confirmLabel,
  danger = false,
  disabled,
  label,
  run,
  type = 'default'
}: {
  confirm: string;
  confirmLabel: string;
  danger?: boolean;
  disabled: boolean;
  label: string;
  run: () => void | Promise<unknown>;
  type?: 'default' | 'link';
}) {
  return (
    <Popconfirm
      title={confirm}
      okText={confirmLabel}
      disabled={disabled}
      okButtonProps={{ danger, disabled }}
      onConfirm={() => !disabled && void run()}
    >
      <Button size="small" type={type} danger={danger} disabled={disabled}>
        {label}
      </Button>
    </Popconfirm>
  );
}
