/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { saveBrowserDownload } from '@/shared/browser-download';
import { spanPageCsv } from '../model/explore-span-export';
import type { TraceSpanRow } from '../model/explore-trace-analytics';
export function ExploreSpanExport({
  rows,
  pageIndex,
  current
}: {
  rows: TraceSpanRow[];
  pageIndex: number;
  current: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      disabled={!current || rows.length === 0}
      onClick={() =>
        saveBrowserDownload({
          filename: `hertzbeat-spans-page-${pageIndex + 1}.csv`,
          data: new Blob(['\uFEFF', spanPageCsv(rows)], { type: 'text/csv;charset=utf-8' })
        })
      }
    >
      {t('exploreTrace.exportCurrentPage')}
    </Button>
  );
}
