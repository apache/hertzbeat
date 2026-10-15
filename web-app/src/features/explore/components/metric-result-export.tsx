/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
