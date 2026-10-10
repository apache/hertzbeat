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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { InvestigationTimeWindow, SignalKind } from '@/shared/query-context';

import type { MonitorInvestigationViewState } from '../model/monitor-investigation-model';
import type { MonitorSignalCapabilityState } from '../model/monitor-signal-view-model';
import styles from './monitor-signal-view.module.css';
import { monitorInvestigationSectionState, monitorInvestigationSnapshot } from './monitor-signal-view-formatters';
import {
  MonitorCompactState,
  MonitorSignalFact,
  MonitorSignalSection,
  MonitorSignalSource
} from './monitor-signal-view-primitives';

export function MonitorBoundEntitySection({
  state,
  openEntity
}: {
  state: MonitorInvestigationViewState;
  openEntity: (id: number, window: InvestigationTimeWindow) => void;
}) {
  const { t } = useTranslation();
  const binding = monitorInvestigationSnapshot(state)?.binding;
  const window = state.kind === 'ready' ? state.window : undefined;
  return (
    <MonitorSignalSection title={t('monitorSignals.sections.boundEntity')}>
      {binding?.state === 'ready' && window ? (
        <div className={styles.entityBody}>
          <dl className={styles.entityFacts}>
            <MonitorSignalFact label={t('monitorSignals.entity.serviceName')} value={binding.identity.serviceName} />
            <MonitorSignalFact label={t('monitorSignals.entity.type')} value={binding.identity.entityType} />
            <MonitorSignalFact
              label={t('monitorSignals.entity.id')}
              value={String(binding.identity.entityId)}
              title={String(binding.identity.entityId)}
            />
            <MonitorSignalFact
              label={t('monitorSignals.entity.namespace')}
              value={binding.identity.serviceNamespace ?? t('common.unavailable')}
            />
            <MonitorSignalFact
              label={t('monitorSignals.entity.environment')}
              value={binding.identity.environment ?? t('common.unavailable')}
            />
          </dl>
          <Button onClick={() => openEntity(binding.identity.entityId, window)}>
            {t('monitorSignals.entity.open')}
          </Button>
        </div>
      ) : (
        <MonitorCompactState
          state={monitorInvestigationSectionState(state, binding?.state)}
          prefix="monitorSignals.entity"
        />
      )}
      {binding ? <MonitorSignalSource>{t('monitorSignals.sources.entityBinding')}</MonitorSignalSource> : null}
    </MonitorSignalSection>
  );
}

export function MonitorOtlpEvidenceSection({
  state,
  openSignal
}: {
  state: MonitorInvestigationViewState;
  openSignal: (signal: SignalKind) => void;
}) {
  const { t } = useTranslation();
  const binding = monitorInvestigationSnapshot(state)?.binding;
  const signals = binding?.state === 'ready' ? binding.identity.signals : [];
  return (
    <MonitorSignalSection title={t('monitorSignals.sections.otelEvidence')}>
      <p className={styles.scopeNote}>{t('monitorSignals.otel.scope')}</p>
      {signals.length > 0 ? (
        <div className={styles.otelRows}>
          {signals.map(signal => (
            <Button key={signal} onClick={() => openSignal(signal)}>
              {t('monitorSignals.otel.open', { signal: t(`monitorSignals.signals.${signal}`) })}
            </Button>
          ))}
        </div>
      ) : (
        <MonitorCompactState
          state={otlpState(state)}
          prefix="monitorSignals.otel"
          messageKey={binding?.state === 'empty' ? 'monitorSignals.otel.noEntity' : undefined}
        />
      )}
      {binding?.state === 'ready' ? (
        <MonitorSignalSource>{t('monitorSignals.sources.otelBinding')}</MonitorSignalSource>
      ) : null}
    </MonitorSignalSection>
  );
}

function otlpState(state: MonitorInvestigationViewState): MonitorSignalCapabilityState {
  const binding = monitorInvestigationSnapshot(state)?.binding;
  if (binding?.state === 'empty') return 'unavailable';
  if (binding?.state === 'ready') return 'empty';
  return monitorInvestigationSectionState(state, binding?.state);
}
