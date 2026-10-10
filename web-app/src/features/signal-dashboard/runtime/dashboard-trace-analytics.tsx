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

import { useTranslation } from 'react-i18next';
import type { HertzBeatQueryOutcome } from '@/platform/perses';
import type { TraceSpanPage, TraceGroups } from '@/platform/perses';
import { TraceSpanRows } from '@/platform/perses';
import { TraceGroupRows } from '@/platform/perses';
import { DEFAULT_TRACE_COLUMNS, type HertzBeatTraceDisplay } from '@/platform/perses';
type Props = {
  display?: HertzBeatTraceDisplay | undefined;
  timeZone?: string | undefined;
} & (
  | { kind: 'trace-spans'; outcome: HertzBeatQueryOutcome<TraceSpanPage> }
  | { kind: 'trace-groups'; outcome: HertzBeatQueryOutcome<TraceGroups> }
);
export function DashboardTraceAnalytics(props: Props) {
  const { t } = useTranslation();
  const { outcome } = props;
  if (outcome.state === 'error') return <p role="alert">{t(outcome.error.messageKey)}</p>;
  if (outcome.state === 'empty') return <p role="status">{t('exploreTrace.analytics.empty')}</p>;
  if (outcome.data.state !== 'ready' || !outcome.data.data)
    return <p role="alert">{t('exploreTrace.analytics.unavailable')}</p>;
  const evidence = outcome.data;
  return (
    <>
      <p>{t(`exploreTrace.analytics.${evidence.population}`)}</p>
      {evidence.coverage?.mode === 'bounded' && (
        <p>
          {t('exploreTrace.analytics.bounded', { limit: evidence.coverage.rowLimit })}
          {evidence.coverage.truncated && ` ${t('exploreTrace.analytics.truncated')}`}
        </p>
      )}
      <AnalyticsRows {...props} />
    </>
  );
}
function AnalyticsRows(props: Props) {
  const { t } = useTranslation();
  if (props.outcome.state !== 'ready') return null;
  if (props.kind === 'trace-spans') {
    const data = props.outcome.data.data;
    if (!data) return null;
    return (
      <>
        {!data.content.length && <p role="status">{t('exploreTrace.analytics.empty')}</p>}
        <TraceSpanRows
          data={data}
          display={props.display ?? { columns: DEFAULT_TRACE_COLUMNS, density: 'compact' }}
          timeZone={props.timeZone}
          enabled={false}
        />
        <p>{t('exploreTrace.analytics.pageSubset', { shown: data.content.length, total: data.totalElements })}</p>
      </>
    );
  }
  const data = props.outcome.data.data;
  if (!data) return null;
  return (
    <>
      {data.membership === 'multiple' && <p>{t('exploreTrace.analytics.membership')}</p>}
      {!data.groups.length && <p role="status">{t('exploreTrace.analytics.empty')}</p>}
      <TraceGroupRows data={data} enabled={false} />
      {data.truncated && <p>{t('exploreTrace.analytics.topValues')}</p>}
    </>
  );
}
