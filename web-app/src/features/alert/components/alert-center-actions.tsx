/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertGroup } from '../model/alert-model';
import styles from '../shared/alert-center.module.css';
import { AlertCenterConfirmedAction } from './alert-center-confirmed-action';

type BulkActions = {
  acknowledge: () => void | Promise<unknown>;
  clear: () => void;
  remove: () => void | Promise<unknown>;
  reopen: () => void | Promise<unknown>;
  resolve: () => void | Promise<unknown>;
  unacknowledge: () => void | Promise<unknown>;
};

export function AlertCenterBulkActions({
  busy,
  selectedGroups,
  actions
}: {
  busy: boolean;
  selectedGroups: AlertGroup[];
  actions: BulkActions;
}) {
  const { t } = useTranslation();
  const counts = countSelectedStatuses(selectedGroups);
  const selectedCount = selectedGroups.length;
  if (selectedCount === 0) return null;
  return (
    <div className={styles.bulkActions}>
      <Typography.Text>{t('alert.selected', { count: selectedCount })}</Typography.Text>
      <Space wrap size="small">
        <AlertCenterBulkStatusActions busy={busy} counts={counts} actions={actions} />
        <AlertCenterConfirmedAction
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

function AlertCenterBulkStatusActions({
  busy,
  counts,
  actions
}: {
  busy: boolean;
  counts: ReturnType<typeof countSelectedStatuses>;
  actions: BulkActions;
}) {
  const { t } = useTranslation();
  return (
    <>
      {counts.firing > 0 ? (
        <>
          <AlertCenterConfirmedAction
            label={t('alert.acknowledgeSelected')}
            confirm={t('alert.acknowledgeSelectedConfirm', { count: counts.firing })}
            confirmLabel={t('alert.confirmAcknowledge')}
            disabled={busy}
            run={actions.acknowledge}
          />
          <AlertCenterConfirmedAction
            label={t('alert.resolveSelected')}
            confirm={t('alert.resolveSelectedConfirm', { count: counts.firing })}
            confirmLabel={t('alert.confirmResolve')}
            disabled={busy}
            run={actions.resolve}
          />
        </>
      ) : null}
      {counts.acknowledged > 0 ? (
        <AlertCenterConfirmedAction
          label={t('alert.unacknowledgeSelected')}
          confirm={t('alert.unacknowledgeSelectedConfirm', { count: counts.acknowledged })}
          confirmLabel={t('alert.confirmUnacknowledge')}
          disabled={busy}
          run={actions.unacknowledge}
        />
      ) : null}
      {counts.resolved > 0 ? (
        <AlertCenterConfirmedAction
          label={t('alert.reopenSelected')}
          confirm={t('alert.reopenSelectedConfirm', { count: counts.resolved })}
          confirmLabel={t('alert.confirmReopen')}
          disabled={busy}
          run={actions.reopen}
        />
      ) : null}
    </>
  );
}

function countSelectedStatuses(groups: AlertGroup[]) {
  return groups.reduce(
    (counts, group) => {
      if (group.status === 'firing') counts.firing += 1;
      if (group.status === 'acknowledged') counts.acknowledged += 1;
      if (group.status === 'resolved') counts.resolved += 1;
      return counts;
    },
    { firing: 0, acknowledged: 0, resolved: 0 }
  );
}
