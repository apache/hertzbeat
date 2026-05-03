'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { EntityDiscoverySurface } from '@/components/pages/entity-discovery-surface';
import { apiMessageGet } from '@/lib/api-client';
import { loadDiscoveryData } from '@/lib/entity-discovery/controller';

type DiscoveryData = Awaited<ReturnType<typeof loadDiscoveryData>>;

export default function EntityDiscoveryPage() {
  const load = useCallback(async (): Promise<DiscoveryData> => loadDiscoveryData(apiMessageGet), []);

  return (
    <ClientWorkbench load={load} loadingCopy="遥测发现">
      {data => <EntityDiscoverySurface presets={data.presets} activities={data.activities} catalog={data.catalog} />}
    </ClientWorkbench>
  );
}
