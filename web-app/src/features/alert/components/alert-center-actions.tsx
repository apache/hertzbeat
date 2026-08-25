/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertGroup } from '../model/alert-model';
import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
import styles from '../shared/alert-center.module.css';
import { AlertCenterDeleteDialog } from './alert-center-delete-dialog';

type BulkActions = {
  cancelPreparation: () => void;
  clear: () => void;
  prepareFiltered: () => Promise<number[]>;
  removeFiltered: (ids: number[]) => void | Promise<unknown>;
  removeSelected: () => void | Promise<unknown>;
};

export function AlertCenterBulkActions({
  actionPolicy,
  busy,
  filteredTotal,
  selectedGroups,
  actions
}: {
  actionPolicy: AlertCenterActionPolicy;
  busy: boolean;
  filteredTotal: number;
  selectedGroups: AlertGroup[];
  actions: BulkActions;
}) {
  const { t } = useTranslation();
  const selectedCount = selectedGroups.length;
  if (!actionPolicy.canSelect || selectedCount === 0) return null;
  return (
    <div className={styles.bulkActions}>
      <Typography.Text>{t('alert.selected', { count: selectedCount })}</Typography.Text>
      <Space wrap size="small">
        {actionPolicy.canDeleteGroups ? (
          <AlertCenterDeleteDialog
            actions={actions}
            busy={busy}
            filteredTotal={filteredTotal}
            selectedCount={selectedCount}
          />
        ) : null}
        <Button size="small" disabled={busy} onClick={actions.clear}>
          {t('alert.clearSelection')}
        </Button>
      </Space>
    </div>
  );
}
