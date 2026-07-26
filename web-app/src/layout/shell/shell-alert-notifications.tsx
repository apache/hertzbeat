/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, Popover, Spin, Tag } from 'antd';
import type { TFunction } from 'i18next';

import type { ShellAlertNotificationState } from '@/features/alert/shell';

import styles from './hertzbeat-shell.module.css';

export function ShellAlertNotifications({
  state,
  t,
  onOpenAlerts
}: {
  state: ShellAlertNotificationState;
  t: TFunction;
  onOpenAlerts: () => void;
}) {
  const total = state.count.kind === 'ready' ? state.count.total : 0;
  const label = total > 0 ? t('shell.actions.alertsWithCount', { count: total }) : t('shell.actions.alerts');
  return (
    <Popover
      placement="bottomRight"
      trigger="click"
      title={<strong>{t('shell.alerts.title')}</strong>}
      content={<AlertNotificationContent state={state} t={t} onOpenAlerts={onOpenAlerts} />}
    >
      <Badge count={total} overflowCount={99} size="small">
        <Button className={styles.headerAction ?? ''} type="text" aria-label={label} icon={<BellOutlined />} />
      </Badge>
    </Popover>
  );
}

function AlertNotificationContent({
  state,
  t,
  onOpenAlerts
}: {
  state: ShellAlertNotificationState;
  t: TFunction;
  onOpenAlerts: () => void;
}) {
  return (
    <div className={styles.alertPopover}>
      <AlertNotificationList state={state.list} t={t} />
      <Button type="text" block onClick={onOpenAlerts}>
        {t('shell.alerts.openCenter')}
      </Button>
    </div>
  );
}

function AlertNotificationList({ state, t }: { state: ShellAlertNotificationState['list']; t: TFunction }) {
  if (state.kind === 'loading') {
    return (
      <div className={styles.alertPopoverState}>
        <Spin size="small" />
        <span>{t('shell.alerts.loading')}</span>
      </div>
    );
  }
  if (state.kind === 'empty')
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('shell.alerts.empty')} />;
  if (state.kind === 'unavailable') {
    return <div className={styles.alertPopoverState}>{t('shell.alerts.unavailable')}</div>;
  }
  if (state.kind === 'error') return <div className={styles.alertPopoverState}>{t('shell.alerts.error')}</div>;
  return (
    <div className={styles.alertNotificationList} role="list">
      {state.items.map(item => (
        <div className={styles.alertNotificationItem} role="listitem" key={item.id}>
          <div className={styles.alertNotificationTitle}>
            <strong title={item.title}>{item.title}</strong>
            {item.severity ? (
              <Tag color={severityColor(item.severity)}>{t(`alert.severity.${item.severity}`)}</Tag>
            ) : null}
          </div>
          {item.detail ? <span title={item.detail}>{item.detail}</span> : null}
          {item.updatedAt ? <small>{item.updatedAt}</small> : null}
        </div>
      ))}
    </div>
  );
}

function severityColor(severity: 'info' | 'warning' | 'critical' | 'emergency') {
  if (severity === 'warning') return 'gold';
  if (severity === 'critical' || severity === 'emergency') return 'red';
  return 'blue';
}
