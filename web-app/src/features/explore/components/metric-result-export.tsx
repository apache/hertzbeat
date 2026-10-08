/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { MetricSeries } from '@/platform/perses';
import { saveBrowserDownload } from '@/shared/browser-download';
import type { ExactTimeWindow } from '@/shared/query-context';
import { metricResultCsv } from '../model/explore-metric-export';

export function MetricResultExport({
  series,
  received,
  timeWindow,
  executedQuery,
  t
}: {
  series: MetricSeries[];
  received: number;
  timeWindow: ExactTimeWindow;
  executedQuery: string | null;
  t: TFunction;
}) {
  const [failure, setFailure] = useState<string>();
  const enabled = received > 0;
  function download() {
    if (!enabled) return;
    setFailure(undefined);
    try {
      saveBrowserDownload({
        filename: `hertzbeat-metrics-${timeWindow.from}-${timeWindow.to}.csv`,
        data: new Blob(['\uFEFF', metricResultCsv(series, timeWindow, executedQuery)], {
          type: 'text/csv;charset=utf-8'
        })
      });
    } catch (error) {
      setFailure(
        error instanceof RangeError && error.message === 'METRIC_CSV_TOO_LARGE'
          ? 'exploreMetric.exportCsvTooLarge'
          : 'exploreMetric.exportCsvFailed'
      );
    }
  }
  return (
    <>
      <Button size="small" disabled={!enabled} title={t('exploreMetric.exportCsvHelp')} onClick={download}>
        {t('exploreMetric.exportCsv')}
      </Button>
      {failure && <span role="alert">{t(failure)}</span>}
    </>
  );
}
