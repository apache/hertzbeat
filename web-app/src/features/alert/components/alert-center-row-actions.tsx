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

const alertStatusActionCopy = {
  acknowledge: {
    labelKey: 'alert.acknowledge',
    confirmKey: 'alert.acknowledgeConfirm',
    confirmLabelKey: 'alert.confirmAcknowledge'
  },
  reopen: {
    labelKey: 'alert.reopen',
    confirmKey: 'alert.reopenConfirm',
    confirmLabelKey: 'alert.confirmReopen'
  },
  resolve: {
    labelKey: 'alert.resolve',
    confirmKey: 'alert.resolveConfirm',
    confirmLabelKey: 'alert.confirmResolve'
  },
  unacknowledge: {
    labelKey: 'alert.unacknowledge',
    confirmKey: 'alert.unacknowledgeConfirm',
    confirmLabelKey: 'alert.confirmUnacknowledge'
  }
} as const;

type AlertStatusAction = keyof typeof alertStatusActionCopy;

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
  if (group.status === 'acknowledged') {
    return (
      <>
        <AlertCenterStatusAction action="unacknowledge" busy={busy} group={group} run={unacknowledge} />
        <AlertCenterStatusAction action="resolve" busy={busy} group={group} run={resolve} />
      </>
    );
  }
  if (group.status === 'resolved') {
    return <AlertCenterStatusAction action="reopen" busy={busy} group={group} run={reopen} />;
  }
  if (group.status === 'firing') {
    return (
      <>
        <AlertCenterStatusAction action="acknowledge" busy={busy} group={group} run={acknowledge} />
        <AlertCenterStatusAction action="resolve" busy={busy} group={group} run={resolve} />
      </>
    );
  }
  return null;
}

function AlertCenterStatusAction({
  action,
  busy,
  group,
  run
}: {
  action: AlertStatusAction;
  busy: boolean;
  group: AlertGroup;
  run: (group: AlertGroup) => void | Promise<unknown>;
}) {
  const { t } = useTranslation();
  const copy = alertStatusActionCopy[action];
  return (
    <AlertCenterConfirmedAction
      type="link"
      label={t(copy.labelKey)}
      confirm={t(copy.confirmKey)}
      confirmLabel={t(copy.confirmLabelKey)}
      disabled={busy}
      run={() => run(group)}
    />
  );
}
