/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Space } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertGroup } from '../model/alert-model';
import { AlertCenterConfirmedAction } from './alert-center-confirmed-action';

type AlertCenterRowActionsProps = {
  acknowledge: (group: AlertGroup) => void | Promise<unknown>;
  busy: boolean;
  group: AlertGroup;
  remove: (group: AlertGroup) => void | Promise<unknown>;
  reopen: (group: AlertGroup) => void | Promise<unknown>;
  resolve: (group: AlertGroup) => void | Promise<unknown>;
  unacknowledge: (group: AlertGroup) => void | Promise<unknown>;
};

export function AlertCenterRowActions(props: AlertCenterRowActionsProps) {
  const { busy, group, remove } = props;
  const { t } = useTranslation();
  return (
    <Space size={0}>
      <AlertCenterRowStatusActions {...props} />
      <AlertCenterConfirmedAction
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

function AlertCenterRowStatusActions({
  acknowledge,
  busy,
  group,
  reopen,
  resolve,
  unacknowledge
}: AlertCenterRowActionsProps) {
  const { t } = useTranslation();
  if (group.status === 'acknowledged') {
    return (
      <AlertCenterConfirmedAction
        type="link"
        label={t('alert.unacknowledge')}
        confirm={t('alert.unacknowledgeConfirm')}
        confirmLabel={t('alert.confirmUnacknowledge')}
        disabled={busy}
        run={() => unacknowledge(group)}
      />
    );
  }
  if (group.status === 'resolved') {
    return (
      <AlertCenterConfirmedAction
        type="link"
        label={t('alert.reopen')}
        confirm={t('alert.reopenConfirm')}
        confirmLabel={t('alert.confirmReopen')}
        disabled={busy}
        run={() => reopen(group)}
      />
    );
  }
  return (
    <>
      {group.status === 'firing' ? (
        <AlertCenterConfirmedAction
          type="link"
          label={t('alert.acknowledge')}
          confirm={t('alert.acknowledgeConfirm')}
          confirmLabel={t('alert.confirmAcknowledge')}
          disabled={busy}
          run={() => acknowledge(group)}
        />
      ) : null}
      <AlertCenterConfirmedAction
        type="link"
        label={t('alert.resolve')}
        confirm={t('alert.resolveConfirm')}
        confirmLabel={t('alert.confirmResolve')}
        disabled={busy}
        run={() => resolve(group)}
      />
    </>
  );
}
