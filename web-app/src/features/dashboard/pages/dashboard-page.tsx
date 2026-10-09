/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { DashboardStart } from '../components/dashboard-start';
import { DashboardActivity } from '../components/dashboard-activity';
import styles from '../components/dashboard-activity.module.css';
import { useDashboardStartController } from '../controller/use-dashboard-start-controller';

export function DashboardPage() {
  const { t } = useTranslation();
  const start = useDashboardStartController();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t(start.activity.firstUse ? 'dashboard.start.title' : 'dashboard.daily.title')}
        description={t(start.activity.firstUse ? 'dashboard.start.description' : 'dashboard.daily.description')}
        actions={<Link to={start.savedQueriesTarget}>{t('exploreSaved.directory')}</Link>}
      />
      {start.activity.firstUse ? (
        <>
          <Link to={start.activity.targets.signals}>{t('dashboard.daily.openSignals')}</Link>
          <DashboardStart {...start} />
        </>
      ) : (
        <>
          <DashboardActivity activity={start.activity} />
          <details className={styles.intake}>
            <summary>{t('dashboard.daily.addData')}</summary>
            <DashboardStart {...start} />
          </details>
        </>
      )}
    </OperationalPage>
  );
}
