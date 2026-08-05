/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { RuntimeStatusViewModel } from '@/features/runtime-status';
import { alertRoutePaths, monitorRoutePaths } from '@/shared/navigation/app-paths';
import { OperationalResultRegion, OperationalSection } from '@/shared/operational-page';
import { settingsPaths } from '@/shared/settings/settings-routes';

import type { DashboardAlertState, DashboardMonitorState } from '../model/dashboard-model';
import { DashboardAlertSummary } from './dashboard-alert-results';
import { DashboardMonitorSummary } from './dashboard-monitor-results';
import { DashboardRuntimeSummary } from './dashboard-runtime-results';
import styles from './dashboard.module.css';

export function DashboardOperationalSummary({
  alerts,
  monitors,
  runtime
}: {
  alerts: DashboardAlertState;
  monitors: DashboardMonitorState;
  runtime: RuntimeStatusViewModel;
}) {
  const { t } = useTranslation();
  return (
    <OperationalSection title={t('dashboard.operationsSummary')} description={t('dashboard.operationsDescription')}>
      <OperationalResultRegion>
        <div className={styles.summaryBoard} data-testid="dashboard-operational-summary">
          <SummarySource
            title={t('dashboard.runtimeSummary')}
            action={
              runtime.state === 'ready' || (runtime.state === 'request-failed' && runtime.failure !== 'permission') ? (
                <Link to={settingsPaths.collectors}>{t('dashboard.openCollectors')}</Link>
              ) : null
            }
          >
            <DashboardRuntimeSummary state={runtime} />
          </SummarySource>
          <SummarySource
            title={t('dashboard.monitorSummary')}
            action={
              monitors.kind === 'permission' ? null : (
                <Link to={monitorRoutePaths.list}>{t('dashboard.openMonitors')}</Link>
              )
            }
          >
            <DashboardMonitorSummary state={monitors} />
          </SummarySource>
          <SummarySource
            title={t('dashboard.alertSummary')}
            action={
              alerts.kind === 'permission' ? null : <Link to={alertRoutePaths.center}>{t('dashboard.openAlerts')}</Link>
            }
          >
            <DashboardAlertSummary state={alerts} />
          </SummarySource>
        </div>
      </OperationalResultRegion>
    </OperationalSection>
  );
}

function SummarySource({ action, children, title }: { action: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className={styles.summaryRow} aria-label={title}>
      <div className={styles.summaryIdentity}>
        <Typography.Text strong>{title}</Typography.Text>
        {action}
      </div>
      {children}
    </section>
  );
}
