/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useTranslation } from 'react-i18next';

import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';

import { DashboardStart } from '../components/dashboard-start';
import { useDashboardStartController } from '../controller/use-dashboard-start-controller';

export function DashboardPage() {
  const { t } = useTranslation();
  const start = useDashboardStartController();
  return (
    <OperationalPage>
      <OperationalPageHeader title={t('dashboard.start.title')} description={t('dashboard.start.description')} />
      <DashboardStart {...start} />
    </OperationalPage>
  );
}
