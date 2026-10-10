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

import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import styles from './entity-signal-view.module.css';

type ReadyState = Extract<EntitySignalViewState, { kind: 'ready' }>;
type SignalKey = 'metrics' | 'logs' | 'traces' | 'topology' | 'collection' | 'alerts';

export function SignalAvailability({ state }: { state: ReadyState }) {
  const { t } = useTranslation();
  const signals: SignalKey[] = ['metrics', 'logs', 'traces', 'topology', 'collection', 'alerts'];
  return (
    <div className={styles.availability} aria-label={t('entity.signals.availability')}>
      {signals.map(signal => (
        <div
          className={styles.availabilityItem}
          key={signal}
          role="group"
          aria-label={t(`entity.signals.sections.${signal}`)}
        >
          <span>{t(`entity.signals.sections.${signal}`)}</span>
          <Tag className={styles.stateTag ?? ''} color={capabilityColor(state.capabilities[signal])}>
            {t(`entity.signals.states.${state.capabilities[signal]}`)}
          </Tag>
          {state.capabilities[signal] !== 'available' ? <small>{t(compactMessageKey(state, signal))}</small> : null}
        </div>
      ))}
    </div>
  );
}

function compactMessageKey(state: ReadyState, signal: SignalKey) {
  if (signal === 'metrics' && state.capabilities.metrics === 'unknown') {
    const redState = state.capabilities.redMetrics;
    if (redState === 'empty' || redState === 'unavailable') {
      return `entity.signals.compact.redMetrics.${redState}`;
    }
  }
  return `entity.signals.compact.${signal}.${state.capabilities[signal]}`;
}

export function EvidenceRail({ state }: { state: ReadyState }) {
  const { t } = useTranslation();
  return (
    <aside className={styles.evidenceRail} aria-label={t('entity.signals.evidence.title')}>
      <h2>{t('entity.signals.evidence.title')}</h2>
      <p className={styles.window}>{formatWindow(state)}</p>
      {state.evidence.map(item => (
        <article className={styles.evidenceItem} key={item.key}>
          <strong>
            {t(item.key === 'collection' ? 'entity.signals.boundMonitors' : `entity.signals.sections.${item.key}`)}
          </strong>
          <span>{t(`entity.signals.evidence.reasons.${item.reason.kind}`)}</span>
          <small>{t(`entity.signals.evidence.confidence.${item.confidence}`)}</small>
          {item.key === 'metrics' && state.red?.state === 'ready' ? (
            <small>{t('entity.signals.evidence.greptimeFlow', { resolution: state.red.resolutionSeconds })}</small>
          ) : null}
        </article>
      ))}
      {state.evidence.length === 0 ? (
        <div className={styles.compactState}>{t('entity.signals.evidence.empty')}</div>
      ) : null}
      <div className={styles.scopeNote}>{t('entity.signals.alertsCurrentOnly')}</div>
    </aside>
  );
}

export function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryValue}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function capabilityColor(state: ReadyState['capabilities'][SignalKey]) {
  if (state === 'available') return 'green';
  if (state === 'unavailable') return 'red';
  return 'default';
}

function formatWindow(state: ReadyState) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: state.plan.anchor.window.timeZone
  });
  return `${formatter.format(state.plan.anchor.window.from)} – ${formatter.format(state.plan.anchor.window.to)} · ${state.plan.anchor.window.timeZone}`;
}
