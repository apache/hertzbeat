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

import { InvestigationSection } from '@/features/explore';

import type { AlertInvestigationViewState } from '../model/alert-investigation-contract';
import { SignalBlockState } from './alert-investigation-signal-runtime';
import styles from './alert-investigation-view.module.css';

type ReadyState = Extract<AlertInvestigationViewState, { kind: 'ready' }>;

export function AlertTopologySection({ state, onOpen }: { state: ReadyState; onOpen?: (() => void) | undefined }) {
  const { t } = useTranslation();
  return (
    <InvestigationSection
      title={t('alertInvestigation.sections.topology')}
      action={state.snapshot.topology.state === 'ready' ? onOpen : undefined}
      actionLabel={t('alertInvestigation.actions.openTopology')}
      evidenceCurrent
    >
      {state.snapshot.topology.state === 'ready' ? (
        <div className={styles.tableScroll}>
          <table className={styles.evidenceTable}>
            <thead>
              <tr>
                {['source', 'target', 'relation', 'confidence', 'requests', 'errors'].map(column => (
                  <th key={column}>{t(`alertInvestigation.topology.${column}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.snapshot.topology.edges.map(edge => (
                <tr
                  key={`${edge.sourceType}:${edge.sourceId}:${edge.targetType}:${edge.targetId}:${edge.relationType}`}
                >
                  <td>{`${edge.sourceType}:${edge.sourceId}`}</td>
                  <td>{`${edge.targetType}:${edge.targetId}`}</td>
                  <td>{edge.relationType}</td>
                  <td>{new Intl.NumberFormat(undefined, { style: 'percent' }).format(edge.confidence)}</td>
                  <td>{edge.requestCount.toLocaleString()}</td>
                  <td>{edge.errorCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <SignalBlockState state={state.snapshot.topology.state} />
      )}
    </InvestigationSection>
  );
}

export function AlertCollectionSection({ state }: { state: ReadyState }) {
  const { t } = useTranslation();
  const event = state.snapshot.collection.state === 'ready' ? state.snapshot.collection.event : null;
  const failure = event?.outcome.toUpperCase() === 'FAILURE';
  return (
    <InvestigationSection title={t('alertInvestigation.sections.collection')} evidenceCurrent>
      {event ? (
        <dl className={styles.factGrid}>
          <Fact label={t('alertInvestigation.collection.lastCollection')} value={formatTime(event.observedAt, state)} />
          <Fact
            label={t('alertInvestigation.collection.duration')}
            value={
              event.durationMillis < 0 ? t('alertInvestigation.collection.notRecorded') : `${event.durationMillis} ms`
            }
          />
          <Fact label={t('alertInvestigation.collection.outcome')} value={event.outcome} />
          <Fact label={t('alertInvestigation.collection.collector')} value={factValue(event.collectorId, t)} />
          <Fact label={t('alertInvestigation.collection.target')} value={factValue(event.target, t)} />
          <Fact label={t('alertInvestigation.collection.metricSet')} value={factValue(event.metricSet, t)} />
          {failure ? (
            <>
              <Fact label={t('alertInvestigation.collection.failureClass')} value={factValue(event.failureClass, t)} />
              <Fact label={t('alertInvestigation.collection.phase')} value={factValue(event.phase, t)} />
            </>
          ) : null}
        </dl>
      ) : (
        <SignalBlockState state={state.snapshot.collection.state} />
      )}
    </InvestigationSection>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function factValue(value: string | null, t: (key: string) => string) {
  return value ?? t('alertInvestigation.collection.notRecorded');
}

function formatTime(value: number, state: ReadyState) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: state.route.window.timeZone
  }).format(value);
}
