/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorExportFormat } from '../model/monitor-export-model';

import { MonitorExportButton } from './monitor-export-button';
import { MonitorHelpLink } from './monitor-help-link';
import styles from './monitor-list.module.css';

export function MonitorListManagementActions({
  disabled,
  canWrite,
  canExport,
  create,
  openImport,
  exportAll
}: {
  disabled: boolean;
  canWrite: boolean;
  canExport: boolean;
  create: () => void;
  openImport: () => void;
  exportAll: (format: MonitorExportFormat) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={styles.managementActions}
      role="group"
      aria-label={t('common.actions')}
      data-monitor-management-actions=""
    >
      <MonitorHelpLink />
      {canWrite ? (
        <>
          <Button type="primary" disabled={disabled} onClick={create}>
            {t('monitor.editor.newTitle')}
          </Button>
          <Button disabled={disabled} onClick={openImport}>
            {t('monitor.import.action')}
          </Button>
        </>
      ) : null}
      {canExport ? (
        <MonitorExportButton label={t('monitor.export.all')} disabled={disabled} onExport={exportAll} />
      ) : null}
    </div>
  );
}
