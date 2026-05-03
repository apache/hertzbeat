'use client';

import React, { useCallback, useState } from 'react';
import { BulletinCenterSurface, type BulletinCenterData } from '../../components/pages/bulletin-center-surface';
import { useI18n } from '../../components/providers/i18n-provider';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { apiMessageGet } from '../../lib/api-client';
import { loadBulletinData } from '../../lib/bulletin-center/controller';

export default function BulletinPage() {
  const { t } = useI18n();
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async (): Promise<BulletinCenterData> => {
    return loadBulletinData(apiMessageGet, ' '.repeat(refreshTick));
  }, [refreshTick]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('bulletin.loading')}>
      {data => <BulletinCenterSurface data={data} refreshTick={refreshTick} onReload={() => setRefreshTick(value => value + 1)} />}
    </ClientWorkbench>
  );
}
