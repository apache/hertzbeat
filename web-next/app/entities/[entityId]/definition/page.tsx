'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { EntityDefinitionWorkspaceSurface } from '@/components/pages/entity-definition-workspace-surface';
import { apiMessageGet } from '@/lib/api-client';
import { loadEntityDefinitionPageData } from '@/lib/entity-definition/controller';

type DefinitionPageData = Awaited<ReturnType<typeof loadEntityDefinitionPageData>>;

export default function EntityDefinitionPage({ params }: { params: Promise<{ entityId: string }> }) {
  const load = useCallback(async (): Promise<DefinitionPageData> => {
    const resolved = await params;
    return loadEntityDefinitionPageData(apiMessageGet, resolved.entityId, 'yaml');
  }, [params]);

  return (
    <ClientWorkbench load={load} loadingCopy="编辑实体定义">
      {data => (
        <EntityDefinitionWorkspaceSurface
          mode="definition"
          entityId={data.entityId}
          initialContent={data.definition}
          initialFormat="yaml"
          initialMessage={data.loadMessage}
          templates={data.templates}
          activities={data.activities}
        />
      )}
    </ClientWorkbench>
  );
}
