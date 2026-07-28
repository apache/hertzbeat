/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { alertGroupIdentity, type AlertGroup } from '../model/alert-model';
import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
import { AlertCenterConfirmedAction } from './alert-center-confirmed-action';

type AlertCenterRowActionsProps = {
  actionPolicy: AlertCenterActionPolicy;
  acknowledge: (group: AlertGroup) => void | Promise<unknown>;
  busy: boolean;
  group: AlertGroup;
  remove: (group: AlertGroup) => void | Promise<unknown>;
  reopen: (group: AlertGroup) => void | Promise<unknown>;
  resolve: (group: AlertGroup) => void | Promise<unknown>;
  unacknowledge: (group: AlertGroup) => void | Promise<unknown>;
};

export function AlertCenterRowActions(props: AlertCenterRowActionsProps) {
  const { actionPolicy, busy, group, remove } = props;
  const { t } = useTranslation();
  return (
    <Space size={0}>
      {actionPolicy.canUpdateStatus ? <AlertCenterRowStatusActions {...props} /> : null}
      {actionPolicy.canDeleteGroups ? (
        <AlertCenterConfirmedAction
          type="link"
          danger
          label={t('alert.delete')}
          confirm={t('alert.deleteConfirm', { target: alertGroupIdentity(group) })}
          confirmLabel={t('alert.confirmDelete')}
          disabled={busy}
          run={() => remove(group)}
        />
      ) : null}
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
      <>
        <AlertCenterConfirmedAction
          type="link"
          label={t('alert.unacknowledge')}
          confirm={t('alert.unacknowledgeConfirm')}
          confirmLabel={t('alert.confirmUnacknowledge')}
          disabled={busy}
          run={() => unacknowledge(group)}
        />
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
  if (group.status === 'firing') {
    return (
      <>
        <AlertCenterConfirmedAction
          type="link"
          label={t('alert.acknowledge')}
          confirm={t('alert.acknowledgeConfirm')}
          confirmLabel={t('alert.confirmAcknowledge')}
          disabled={busy}
          run={() => acknowledge(group)}
        />
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
  return null;
}
