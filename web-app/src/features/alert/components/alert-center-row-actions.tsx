/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Popconfirm } from 'antd';
import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { alertGroupIdentity, type AlertGroup } from '../model/alert-model';
import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
import styles from '../shared/alert-center.module.css';

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
  const [pendingAction, setPendingAction] = useState<RowAction | null>(null);
  const statusActions = actionPolicy.canUpdateStatus ? statusActionsForGroup(props, t) : [];
  const menuActions = actionPolicy.canDeleteGroups
    ? [
        ...statusActions,
        {
          key: 'delete' as const,
          label: t('alert.delete'),
          confirm: t('alert.deleteConfirm', { target: alertGroupIdentity(group) }),
          confirmLabel: t('alert.confirmDelete'),
          danger: true,
          run: () => remove(group)
        }
      ]
    : statusActions;

  return (
    <div className={styles.rowActions}>
      {menuActions.length > 0 ? (
        <Popconfirm
          open={pendingAction !== null}
          title={pendingAction?.confirm}
          okText={pendingAction?.confirmLabel}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: Boolean(pendingAction?.danger), disabled: busy }}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            if (!busy) void pendingAction?.run();
            setPendingAction(null);
          }}
          onOpenChange={open => {
            if (!open) setPendingAction(null);
          }}
        >
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: rowActionMenuItems(menuActions, busy),
              onClick: ({ key }) => setPendingAction(menuActions.find(action => action.key === key) ?? null)
            }}
          >
            <Button
              className={styles.moreAction ?? ''}
              type="text"
              size="small"
              aria-label={t('alert.moreActions')}
              disabled={busy}
              icon={<MoreOutlined aria-hidden="true" />}
            />
          </Dropdown>
        </Popconfirm>
      ) : null}
    </div>
  );
}

type RowAction = {
  key: AlertStatusAction | 'delete';
  label: string;
  confirm: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => void | Promise<unknown>;
};

type Translator = TFunction;

function statusActionsForGroup(props: AlertCenterRowActionsProps, t: Translator) {
  if (props.group.status === 'firing') {
    return [statusAction('acknowledge', props, t), statusAction('resolve', props, t)];
  }
  if (props.group.status === 'acknowledged') {
    return [statusAction('resolve', props, t), statusAction('unacknowledge', props, t)];
  }
  if (props.group.status === 'resolved') return [statusAction('reopen', props, t)];
  return [];
}

function statusAction(action: AlertStatusAction, props: AlertCenterRowActionsProps, t: Translator): RowAction {
  const copy = alertStatusActionCopy[action];
  const run = props[action];
  return {
    key: action,
    label: t(copy.labelKey),
    confirm: t(copy.confirmKey),
    confirmLabel: t(copy.confirmLabelKey),
    run: () => run(props.group)
  };
}

function rowActionMenuItems(actions: RowAction[], busy: boolean): NonNullable<MenuProps['items']> {
  return actions.map(action => ({
    key: action.key,
    label: action.label,
    danger: Boolean(action.danger),
    disabled: busy
  }));
}
