/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Alert } from 'antd';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalSection, OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { MonitorMetricResults } from './monitor-metric-results';
import styles from './monitor-metric-workbench.module.css';

export function MonitorMetricWorkbench({ state, actions }: MonitorMetricWorkbenchController) {
  if (state.catalog.kind !== 'ready' && state.realtimeGroups.length === 0) {
    return <MonitorMetricCatalogState catalog={state.catalog} />;
  }
  return <MonitorMetricReadyWorkbench state={state} actions={actions} />;
}

function MonitorMetricCatalogState({
  catalog
}: {
  catalog: Exclude<MonitorMetricWorkbenchController['state']['catalog'], { kind: 'ready' }>;
}) {
  const { t } = useTranslation();
  const presentation = monitorMetricCatalogPresentation(catalog);
  return (
    <OperationalSection title={t('monitorMetrics.title')} description={t('monitorMetrics.description')}>
      <OperationalStatePanel
        kind={presentation.kind}
        title={t(presentation.messageKey)}
        description={presentation.description}
      />
    </OperationalSection>
  );
}

function monitorMetricCatalogPresentation(
  catalog: Exclude<MonitorMetricWorkbenchController['state']['catalog'], { kind: 'ready' }>
): { kind: OperationalStateKind; messageKey: string; description?: string | undefined } {
  switch (catalog.kind) {
    case 'loading':
      return { kind: 'loading', messageKey: 'monitorMetrics.loading' };
    case 'empty':
      return { kind: 'empty', messageKey: 'monitorMetrics.noCatalog' };
    case 'fallback':
      return {
        kind: 'unavailable',
        messageKey: 'common.unavailable',
        description: catalog.references.join(', ')
      };
    case 'unavailable':
      return { kind: 'unavailable', messageKey: 'common.unavailable' };
    case 'error':
      return { kind: 'error', messageKey: 'common.routeError.description' };
  }
}

function MonitorMetricReadyWorkbench({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  const historyHeight = state.layout.layout.historyDock.height * 22;
  return (
    <section
      className={styles.workbench}
      aria-label={t('monitorMetrics.title')}
      style={{ '--monitor-history-height': `${historyHeight}px` } as CSSProperties}
    >
      {state.favorite.kind === 'unavailable' && <Alert type="warning" showIcon message={t('common.unavailable')} />}
      {state.favorite.kind === 'error' && <Alert type="error" showIcon message={t('common.routeError.description')} />}
      <MonitorMetricResults state={state} actions={actions} />
    </section>
  );
}
