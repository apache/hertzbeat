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

import type { MonitorCollectionEvent, MonitorInvestigationViewState } from '../model/monitor-investigation-model';
import styles from './monitor-signal-view.module.css';
import {
  formatMonitorDuration,
  formatMonitorTimestamp,
  monitorInvestigationSectionState,
  monitorInvestigationSnapshot
} from './monitor-signal-view-formatters';
import {
  MonitorCompactState,
  MonitorSignalFact,
  MonitorSignalSection,
  MonitorSignalSource
} from './monitor-signal-view-primitives';

export function MonitorSignalCollection({ state }: { state: MonitorInvestigationViewState }) {
  const { t } = useTranslation();
  const collection = monitorInvestigationSnapshot(state)?.collection;
  return (
    <MonitorSignalSection title={t('monitorSignals.sections.collectionHealth')}>
      {collection?.state === 'ready' && state.kind === 'ready' ? (
        <CollectionFacts event={collection.event} timeZone={state.window.timeZone} />
      ) : null}
      {collection?.state !== 'ready' ? (
        <MonitorCompactState
          state={monitorInvestigationSectionState(state, collection?.state)}
          prefix="monitorSignals.collection"
        />
      ) : null}
      {collection ? <MonitorSignalSource>{t('monitorSignals.sources.collection')}</MonitorSignalSource> : null}
    </MonitorSignalSection>
  );
}

function CollectionFacts({ event, timeZone }: { event: MonitorCollectionEvent; timeZone: string }) {
  const { t } = useTranslation();
  const failureFacts = collectionFailureFacts(event, t);
  return (
    <dl className={styles.collectionFacts}>
      <MonitorSignalFact
        label={t('monitorSignals.collection.last')}
        value={formatMonitorTimestamp(event.observedAt, timeZone) ?? t('common.unavailable')}
      />
      <MonitorSignalFact
        label={t('monitorSignals.collection.duration')}
        value={
          event.durationMillis < 0
            ? t('monitorSignals.collection.notRecorded')
            : formatMonitorDuration(event.durationMillis)
        }
      />
      <MonitorSignalFact
        label={t('monitorSignals.collection.outcome')}
        value={t(`monitorSignals.collection.outcomes.${event.outcome.toLowerCase()}`)}
      />
      <MonitorSignalFact
        label={t('monitorSignals.collection.collector')}
        value={event.collectorId || t('monitorSignals.collection.notRecorded')}
        title={event.collectorId || undefined}
      />
      {failureFacts.map(fact => (
        <MonitorSignalFact key={fact.label} {...fact} />
      ))}
    </dl>
  );
}

function collectionFailureFacts(event: MonitorCollectionEvent, t: ReturnType<typeof useTranslation>['t']) {
  if (event.outcome !== 'FAILURE') return [];
  return [
    ...(event.phase === 'UNKNOWN'
      ? []
      : [
          {
            label: t('monitorSignals.collection.failurePhase'),
            value: t(`monitorSignals.collection.phases.${event.phase}`)
          }
        ]),
    ...(event.failureClass === 'NONE'
      ? []
      : [
          {
            label: t('monitorSignals.collection.failureClass'),
            value: t(`monitorSignals.collection.failureClasses.${event.failureClass}`)
          }
        ])
  ];
}
