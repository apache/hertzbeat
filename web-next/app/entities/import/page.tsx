'use client';

import React, { useCallback } from 'react';
import { ClientWorkbench } from '@/components/workbench/client-workbench';
import { EntityImportSurface } from '@/components/pages/entity-import-surface';
import { apiMessageGet } from '@/lib/api-client';
import { loadImportData } from '@/lib/entity-import/controller';

type ImportData = Awaited<ReturnType<typeof loadImportData>>;

export default function EntityImportPage() {
  const load = useCallback(async (): Promise<ImportData> => loadImportData(apiMessageGet), []);

  return (
    <ClientWorkbench load={load} loadingCopy="导入实体定义">
      {data => <EntityImportSurface templates={data.templates} activities={data.activities} />}
    </ClientWorkbench>
  );
}
