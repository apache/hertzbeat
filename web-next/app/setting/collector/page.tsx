'use client';

import { useCallback, useState } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { useI18n } from '@/components/providers/i18n-provider';
import { CollectorManageSurface } from '@/components/pages/collector-manage-surface';
import { apiMessageGet } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { loadCollectorData } from '@/lib/collector-manage/controller';
import type { CollectorQueryState } from '@/lib/collector-manage/query-state';

export default function SettingCollectorPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<CollectorQueryState>({ search: '' });

  const load = useCallback(async () => {
    return loadCollectorData(apiMessageGet, query);
  }, [query]);

  return (
    <ClientWorkbench load={load} loadingCopy={t('menu.advanced.collector')}>
      {data => (
        <CollectorManageSurface
          t={t}
          data={data}
          search={search}
          formatTime={formatTime}
          onSearchChange={setSearch}
          onSearch={() => setQuery({ search })}
          onRefresh={() => setQuery(current => ({ ...current }))}
          onDeploy={() => {}}
          onGoOnline={() => {}}
          onGoOffline={() => {}}
          onDelete={() => {}}
          onRowGoOnline={() => {}}
          onRowGoOffline={() => {}}
          onRowDelete={() => {}}
        />
      )}
    </ClientWorkbench>
  );
}
