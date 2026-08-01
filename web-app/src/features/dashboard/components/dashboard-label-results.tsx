/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buildMonitorListPath } from '@/shared/navigation/app-paths';
import { OperationalSection, OperationalStatePanel } from '@/shared/operational-page';
import type { DashboardLabelState } from '../model/dashboard-model';

export function DashboardLabelResults({ state }: { state: DashboardLabelState }) {
  const { t } = useTranslation();
  return (
    <OperationalSection title={t('dashboard.labels.title')}>
      <DashboardLabelEvidence state={state} />
    </OperationalSection>
  );
}

function DashboardLabelEvidence({ state }: { state: DashboardLabelState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') return <Skeleton active paragraph={{ rows: 2 }} />;
  if (state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('dashboard.labels.empty')} />;
  if (state.kind !== 'ready') {
    return <Typography.Text type="secondary">{t(`dashboard.labels.states.${state.kind}`)}</Typography.Text>;
  }
  return (
    <Space wrap>
      {state.labels.map(label => (
        <Link key={label} to={buildMonitorListPath({ labels: label })}>
          {label}
        </Link>
      ))}
    </Space>
  );
}
