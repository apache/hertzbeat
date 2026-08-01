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

import { Alert, Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  OperationalCommandBar,
  OperationalSection,
  OperationalStatePanel,
  type OperationalStateKind
} from '@/shared/operational-page';

import { monitorMetricHistoryRanges } from '../model/monitor-detail-model';
import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { MonitorMetricResults } from './monitor-metric-results';
import { MonitorRefreshSelect } from './monitor-refresh-select';
import styles from './monitor-metric-workbench.module.css';

export function MonitorMetricWorkbench({ state, actions }: MonitorMetricWorkbenchController) {
  if (state.catalog.kind !== 'ready') return <MonitorMetricCatalogState catalog={state.catalog} />;
  return <MonitorMetricReadyWorkbench state={state} actions={actions} options={state.catalog.options} />;
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

function MonitorMetricReadyWorkbench({
  state,
  actions,
  options
}: MonitorMetricWorkbenchController & {
  options: MonitorMetricWorkbenchController['state']['catalog']['options'];
}) {
  const { t } = useTranslation();
  return (
    <OperationalSection title={t('monitorMetrics.title')} description={t('monitorMetrics.description')}>
      <div className={styles.workbench}>
        <MonitorMetricToolbar state={state} actions={actions} options={options} />
        {state.favorite.kind === 'unavailable' && <Alert type="warning" showIcon message={t('common.unavailable')} />}
        {state.favorite.kind === 'error' && (
          <Alert type="error" showIcon message={t('common.routeError.description')} />
        )}
        <MonitorMetricResults state={state} actions={actions} />
      </div>
    </OperationalSection>
  );
}

function MonitorMetricToolbar({
  state,
  actions,
  options
}: MonitorMetricWorkbenchController & {
  options: MonitorMetricWorkbenchController['state']['catalog']['options'];
}) {
  const { t } = useTranslation();
  const favoriteKey =
    state.favorite.kind === 'ready' && state.favorite.value ? 'monitorMetrics.unfavorite' : 'monitorMetrics.favorite';
  return (
    <OperationalCommandBar
      ariaLabel={t('monitorMetrics.title')}
      primary={
        <div className={styles.toolbarControls}>
          <Select
            className={styles.metricSelect!}
            showSearch
            optionFilterProp="label"
            value={state.metricKey}
            onChange={actions.setMetric}
            options={options.map(item => ({
              value: item.key,
              label: item.unit ? `${item.key} (${item.unit})` : item.key
            }))}
          />
          <Select
            className={styles.historySelect!}
            value={state.history}
            disabled={!state.historySupported}
            onChange={actions.setHistory}
            options={monitorMetricHistoryRanges.map(value => ({ value, label: value }))}
          />
          <MonitorRefreshSelect value={state.refreshSeconds} onChange={actions.setRefreshSeconds} />
        </div>
      }
      secondary={
        <>
          <Button
            disabled={state.favorite.kind !== 'ready' || state.favoriteBusy}
            loading={state.favoriteBusy}
            onClick={() => void actions.toggleFavorite()}
          >
            {t(favoriteKey)}
          </Button>
          <Button onClick={actions.refresh}>{t('common.refresh')}</Button>
        </>
      }
    />
  );
}
