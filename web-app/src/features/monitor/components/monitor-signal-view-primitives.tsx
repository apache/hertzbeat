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

import type { MonitorSignalCapabilityState } from '../model/monitor-signal-view-model';
import styles from './monitor-signal-view.module.css';

export function MonitorSignalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.signalSection} aria-label={title}>
      <header className={styles.sectionHeader}>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function MonitorCompactState({
  state,
  prefix,
  messageKey
}: {
  state: MonitorSignalCapabilityState;
  prefix: string;
  messageKey?: string | undefined;
}) {
  const { t } = useTranslation();
  const resolvedMessageKey = messageKey ?? (state === 'ready' ? 'monitorSignals.states.ready' : `${prefix}.${state}`);
  return (
    <div className={styles.compactState} data-state={state}>
      {t(resolvedMessageKey)}
    </div>
  );
}

export function MonitorSignalFact({
  label,
  value,
  title
}: {
  label: string;
  value: string;
  title?: string | undefined;
}) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd title={title}>{value}</dd>
    </div>
  );
}

export function MonitorSignalSource({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <small className={styles.source}>
      {t('monitorSignals.source')}: {children}
    </small>
  );
}
