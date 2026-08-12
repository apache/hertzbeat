/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorMetricLayoutActions, MonitorMetricLayoutState } from '../model/monitor-metric-layout-model';
import styles from './monitor-metric-layout.module.css';

export function MonitorMetricLayoutToolbar({
  state,
  actions,
  onBeginEdit
}: {
  state: MonitorMetricLayoutState;
  actions: MonitorMetricLayoutActions;
  onBeginEdit?: (() => void) | undefined;
}) {
  return state.editing ? (
    <LayoutEditToolbar state={state} actions={actions} />
  ) : (
    <LayoutViewToolbar state={state} actions={actions} onBeginEdit={onBeginEdit} />
  );
}

function LayoutViewToolbar({
  state,
  actions,
  onBeginEdit
}: {
  state: MonitorMetricLayoutState;
  actions: MonitorMetricLayoutActions;
  onBeginEdit?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.layoutInlineControl}>
      {state.readState !== 'ready' && state.readState !== 'loading' ? (
        <span className={styles.layoutReadWarning}>{t('monitorMetrics.layout.localFallback')}</span>
      ) : null}
      <Button
        size="small"
        icon={<EditOutlined />}
        aria-label={t('monitorMetrics.layout.edit')}
        onClick={() => {
          onBeginEdit?.();
          actions.beginEdit();
        }}
      >
        {t('monitorMetrics.layout.edit')}
      </Button>
    </div>
  );
}

function LayoutEditToolbar({
  state,
  actions
}: {
  state: MonitorMetricLayoutState;
  actions: MonitorMetricLayoutActions;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.layoutEditInline} role="toolbar" aria-label={t('monitorMetrics.layout.title')}>
      <span className={styles.layoutEditHint}>{t('monitorMetrics.layout.editHint')}</span>
      <div className={styles.layoutEditActions}>
        <Popconfirm
          title={t('monitorMetrics.layout.resetConfirm')}
          okText={t('monitorMetrics.layout.reset')}
          cancelText={t('common.cancel')}
          onConfirm={() => {
            void actions.reset();
          }}
        >
          <Button size="small" disabled={state.saving}>
            {t('monitorMetrics.layout.reset')}
          </Button>
        </Popconfirm>
        <Button size="small" disabled={state.saving} onClick={actions.cancelEdit}>
          {t('common.cancel')}
        </Button>
        <Button
          type="primary"
          size="small"
          loading={state.saving}
          onClick={() => {
            void actions.save();
          }}
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
