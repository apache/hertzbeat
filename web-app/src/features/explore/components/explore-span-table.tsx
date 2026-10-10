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

import { ExploreSpanExport } from './explore-span-export';
/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { TraceSpanRows } from '@/platform/perses';
import { Button } from 'antd';
import { SignalEmptyState } from './signal-result-frame';
import { useTranslation } from 'react-i18next';
import type { HertzBeatTraceDisplay } from '@/platform/perses';
import type { TraceSpanPage, TraceSpanRow, TraceLoad } from '../model/explore-trace-analytics';
import { TraceAnalyticsState, TraceCoverage } from './explore-trace-analytics-state';
import styles from './explore-trace-population.module.css';
type Props = {
  load: TraceLoad<TraceSpanPage>;
  retry: () => void;
  display: HertzBeatTraceDisplay;
  onPage: ((page: number) => void) | undefined;
  onOpen: ((row: TraceSpanRow) => void) | undefined;
  timeZone: string | undefined;
};
export function ExploreSpanTable({ load, retry, display, onPage, onOpen, timeZone }: Props) {
  const { t } = useTranslation(),
    result = ['permission', 'idle'].includes(load.state) ? undefined : load.data,
    data = result?.state === 'ready' ? result.data : null;
  return (
    <div className={styles.result} data-trace-results tabIndex={-1}>
      <TraceAnalyticsState load={load} retry={retry} />
      {result && <TraceCoverage coverage={result.coverage} />}
      {data && (
        <>
          {!data.content.length && (
            <SignalEmptyState
              title={t('exploreTrace.analytics.empty')}
              hint={t('explore.recovery.traces')}
              reviewQueryLabel={t('explore.recovery.reviewQuery')}
            />
          )}
          <TraceSpanRows
            data={data}
            display={display}
            onOpen={onOpen}
            timeZone={timeZone}
            enabled={load.state === 'ready'}
          />
          <div className={styles.footer}>
            <ExploreSpanExport rows={data.content} pageIndex={data.pageIndex} current={load.state === 'ready'} />
            <span>
              {data.totalElements === 0 ? 0 : data.pageIndex + 1} / {Math.ceil(data.totalElements / data.pageSize)} ·{' '}
              {data.totalElements.toLocaleString()}
            </span>
            <Button
              disabled={!onPage || load.state !== 'ready' || data.pageIndex === 0}
              onClick={() => onPage?.(data.pageIndex - 1)}
            >
              {t('explore.perses.previousPage')}
            </Button>
            <Button
              disabled={!onPage || load.state !== 'ready' || (data.pageIndex + 1) * data.pageSize >= data.totalElements}
              onClick={() => onPage?.(data.pageIndex + 1)}
            >
              {t('explore.perses.nextPage')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
