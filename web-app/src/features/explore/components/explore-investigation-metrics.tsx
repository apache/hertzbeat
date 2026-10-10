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

import { HertzBeatMetricTimeSeriesResult, type HertzBeatPersesPrimitiveMessages } from '@/platform/perses';

import type {
  InvestigationBlock,
  InvestigationEvidenceState,
  InvestigationPersesResults,
  TraceInvestigationSnapshot
} from '../model/explore-investigation-contract';
import { InvestigationBlockState } from './explore-investigation-view-primitives';
import metricsStyles from './explore-investigation-metrics.module.css';
import viewStyles from './explore-investigation-view.module.css';

export function InvestigationMetrics({
  red,
  metricBlock,
  panels,
  messages
}: {
  red?: TraceInvestigationSnapshot['red'] | undefined;
  metricBlock: Pick<InvestigationBlock, 'state' | 'reason'>;
  panels: InvestigationPersesResults['metrics'];
  messages: HertzBeatPersesPrimitiveMessages;
}) {
  const { t } = useTranslation();
  return (
    <div className={metricsStyles.metricsBody}>
      {red ? (
        <section className={metricsStyles.redRegion} aria-label={t('exploreInvestigation.metrics.red')}>
          <h3>{t('exploreInvestigation.metrics.red')}</h3>
          {red.state === 'ready' && red.summary ? (
            <RedSummary summary={red.summary} />
          ) : (
            <InvestigationBlockState state={red.state === 'empty' ? 'empty' : 'unavailable'} reason={red.reason} />
          )}
        </section>
      ) : null}
      <section className={metricsStyles.serviceMetrics} aria-label={t('exploreInvestigation.metrics.service')}>
        <h3>{t('exploreInvestigation.metrics.service')}</h3>
        <InvestigationMetricPanels metricBlock={metricBlock} panels={panels} messages={messages} />
      </section>
    </div>
  );
}

export function InvestigationMetricPanels({
  metricBlock,
  panels,
  messages
}: {
  metricBlock: Pick<InvestigationBlock, 'state' | 'reason'>;
  panels: InvestigationPersesResults['metrics'];
  messages: HertzBeatPersesPrimitiveMessages;
}) {
  const readyPanels = readyMetricPanels(metricBlock, panels);
  return readyPanels.length > 0 ? (
    <div className={metricsStyles.metricGrid}>
      {readyPanels.map((panel, index) => (
        <HertzBeatMetricTimeSeriesResult
          key={`${panel.query.metric.name}-${index}`}
          title={panel.query.metric.name}
          ariaLabel={panel.query.metric.name}
          messages={messages}
          query={panel.query}
          outcome={panel.outcome}
        />
      ))}
    </div>
  ) : (
    <InvestigationBlockState state={metricEvidenceState(metricBlock, panels)} reason={metricBlock.reason} />
  );
}

function RedSummary({ summary }: { summary: NonNullable<TraceInvestigationSnapshot['red']['summary']> }) {
  const { t } = useTranslation();
  const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  return (
    <dl className={metricsStyles.redSummary}>
      <Fact
        label={t('exploreInvestigation.metrics.requestRate')}
        value={`${number.format(summary.requestRatePerSecond)}/s`}
      />
      <Fact
        label={t('exploreInvestigation.metrics.errorRate')}
        value={new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(
          summary.errorRate
        )}
      />
      <Fact
        label={t('exploreInvestigation.metrics.latencyP95')}
        value={summary.latencyP95Ms == null ? '—' : `${number.format(summary.latencyP95Ms)} ms`}
      />
      <Fact label={t('exploreInvestigation.metrics.requests')} value={number.format(summary.requestCount)} />
    </dl>
  );
}

function readyMetricPanels(
  block: { state: InvestigationEvidenceState },
  panels: InvestigationPersesResults['metrics']
) {
  return block.state === 'ready'
    ? panels.flatMap(panel => (panel.outcome.state === 'ready' ? [{ ...panel, outcome: panel.outcome }] : []))
    : [];
}

function metricEvidenceState(
  block: { state: InvestigationEvidenceState },
  panels: InvestigationPersesResults['metrics']
): 'empty' | 'unavailable' {
  if (block.state === 'empty') return 'empty';
  if (block.state === 'ready' && panels.some(panel => panel.outcome.state === 'empty')) return 'empty';
  return 'unavailable';
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={viewStyles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
