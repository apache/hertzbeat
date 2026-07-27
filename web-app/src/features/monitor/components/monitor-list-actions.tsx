/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Popconfirm, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorStatusCodes, type Monitor, type MonitorAction } from '../model/monitor-contract';
import type { MonitorExportFormat } from '../model/monitor-export-model';

import { MonitorExportButton } from './monitor-export-button';
import styles from './monitor-list.module.css';

type Runner = (action: MonitorAction, ids: number[]) => void | Promise<void>;

export function MonitorRowActions({
  monitor,
  open,
  run,
  disabled,
  canWrite
}: {
  monitor: Monitor;
  open: (id: number, mode: 'view' | 'edit') => void;
  run: Runner;
  disabled: boolean;
  canWrite: boolean;
}) {
  const { t } = useTranslation();
  const toggle: MonitorAction = monitor.status === monitorStatusCodes.paused ? 'enable' : 'pause';
  const toggleConfirmKey = toggle === 'enable' ? 'monitorActions.rowEnableConfirm' : 'monitorActions.rowPauseConfirm';
  return (
    <Space size={2}>
      <Button type="link" disabled={disabled} onClick={() => open(monitor.id, 'view')}>
        {t('common.view')}
      </Button>
      <Button type="link" disabled={disabled} onClick={() => open(monitor.id, 'edit')}>
        {t('common.edit')}
      </Button>
      {canWrite ? (
        <Button type="link" disabled={disabled} onClick={() => void run('copy', [monitor.id])}>
          {t('monitorActions.copy')}
        </Button>
      ) : null}
      <Popconfirm title={t(toggleConfirmKey, { name: monitor.name })} onConfirm={() => void run(toggle, [monitor.id])}>
        <Button type="link" disabled={disabled}>
          {t(`monitorActions.${toggle}`)}
        </Button>
      </Popconfirm>
      <Popconfirm title={t('monitorActions.deleteConfirm')} onConfirm={() => void run('delete', [monitor.id])}>
        <Button type="link" danger disabled={disabled}>
          {t('monitorActions.delete')}
        </Button>
      </Popconfirm>
    </Space>
  );
}

export function MonitorBulkActions({
  selectedIds,
  run,
  exportSelected,
  canExport,
  clearSelection,
  disabled
}: {
  selectedIds: number[];
  run: (action: MonitorAction) => void | Promise<void>;
  exportSelected: (format: MonitorExportFormat) => Promise<boolean>;
  canExport: boolean;
  clearSelection: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  if (selectedIds.length === 0) return null;
  return (
    <div className={styles.bulk}>
      <Typography.Text>{t('monitorActions.selected', { count: selectedIds.length })}</Typography.Text>
      <Space>
        <Popconfirm
          title={t('monitorActions.selectedEnableConfirm', { count: selectedIds.length })}
          onConfirm={() => void run('enable')}
        >
          <Button disabled={disabled}>{t('monitorActions.enable')}</Button>
        </Popconfirm>
        <Popconfirm
          title={t('monitorActions.selectedPauseConfirm', { count: selectedIds.length })}
          onConfirm={() => void run('pause')}
        >
          <Button disabled={disabled}>{t('monitorActions.pause')}</Button>
        </Popconfirm>
        {canExport ? (
          <MonitorExportButton label={t('monitor.export.selected')} disabled={disabled} onExport={exportSelected} />
        ) : null}
        <Button disabled={disabled} onClick={clearSelection}>
          {t('monitorActions.clearSelection')}
        </Button>
        <Popconfirm title={t('monitorActions.deleteConfirm')} onConfirm={() => void run('delete')}>
          <Button danger disabled={disabled}>
            {t('monitorActions.delete')}
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
}
