/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { saveBrowserDownload } from '@/shared/browser-download';
import type { TracePageResult } from '../model/explore-signal-contract';
import { tracePageCsv } from '../model/explore-trace-export';

export function ExploreTraceResultActions({
  data,
  evidenceCurrent
}: {
  data: TracePageResult;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Space wrap>
      <small>{t(traceCoverageMessage(data.query), { count: data.query?.rowLimit ?? undefined })}</small>
      <Button
        disabled={!evidenceCurrent || data.content.length === 0}
        onClick={() =>
          saveBrowserDownload({
            filename: `hertzbeat-traces-page-${data.number + 1}.csv`,
            data: new Blob(['\uFEFF', tracePageCsv(data.content)], { type: 'text/csv;charset=utf-8' })
          })
        }
      >
        {t('exploreTrace.exportCurrentPage')}
      </Button>
    </Space>
  );
}

function traceCoverageMessage(query: TracePageResult['query']) {
  if (!query) return 'exploreTrace.coverage.unknown';
  if (query.coverage === 'window') return 'exploreTrace.coverage.window';
  if (query.truncated === true) return 'exploreTrace.coverage.truncated';
  return query.truncated === null ? 'exploreTrace.coverage.boundedUnknown' : 'exploreTrace.coverage.bounded';
}
