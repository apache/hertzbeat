'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { BulletinCenterSurface, type BulletinCenterData } from '../../components/pages/bulletin-center-surface';
import { useI18n } from '../../components/providers/i18n-provider';
import { ClientWorkbench } from '../../components/workbench/client-workbench';
import { apiMessageGet } from '../../lib/api-client';
import { loadBulletinData } from '../../lib/bulletin-center/controller';
import { buildBulletinListUrl } from '../../lib/bulletin-center/query-state';

const BULLETIN_CENTER_SETTLED_CACHE_TTL_MS = 10_000;

export default function BulletinPage() {
  const { t } = useI18n();
  const [refreshTick, setRefreshTick] = useState(0);
  const bulletinListSearch = ' '.repeat(refreshTick);
  const bulletinListUrl = useMemo(() => buildBulletinListUrl(bulletinListSearch), [bulletinListSearch]);
  const bulletinCenterCacheKey = useMemo(
    () => ['bulletin-center', bulletinListUrl, refreshTick].join(':'),
    [bulletinListUrl, refreshTick]
  );

  const load = useCallback(async (): Promise<BulletinCenterData> => {
    return loadBulletinData(apiMessageGet, bulletinListSearch);
  }, [bulletinListSearch]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('bulletin.loading')}
      cacheKey={bulletinCenterCacheKey}
      cacheSettledTtlMs={BULLETIN_CENTER_SETTLED_CACHE_TTL_MS}
    >
      {data => <BulletinCenterSurface data={data} refreshTick={refreshTick} onReload={() => setRefreshTick(value => value + 1)} />}
    </ClientWorkbench>
  );
}
