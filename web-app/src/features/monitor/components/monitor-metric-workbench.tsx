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

import { Alert, Button, Empty, Select, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorMetricHistoryRanges } from '../model/monitor-detail-model';
import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { MonitorMetricResults } from './monitor-metric-results';
import { MonitorRefreshSelect } from './monitor-refresh-select';
import styles from './monitor-metric-workbench.module.css';

export function MonitorMetricWorkbench({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();

  if (state.catalog.kind === 'loading')
    return (
      <div className={styles.workbench}>
        <Spin />
      </div>
    );
  if (state.catalog.kind === 'unavailable')
    return (
      <div className={styles.workbench}>
        <Alert type="warning" showIcon message={t('common.unavailable')} />
      </div>
    );
  if (state.catalog.kind === 'error')
    return (
      <div className={styles.workbench}>
        <Alert type="error" showIcon message={t('common.routeError.description')} />
      </div>
    );
  if (state.catalog.kind === 'fallback')
    return (
      <section className={styles.workbench}>
        <Alert
          type="warning"
          showIcon
          message={t('common.unavailable')}
          description={state.catalog.references.join(', ')}
        />
      </section>
    );
  if (state.catalog.kind === 'empty')
    return (
      <div className={styles.workbench}>
        <Empty description={t('monitorMetrics.noCatalog')} />
      </div>
    );
  return <MonitorMetricReadyWorkbench state={state} actions={actions} options={state.catalog.options} />;
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
    <section className={styles.workbench}>
      <header className={styles.heading}>
        <Typography.Title level={4}>{t('monitorMetrics.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('monitorMetrics.description')}</Typography.Text>
      </header>
      <MonitorMetricToolbar state={state} actions={actions} options={options} />
      {state.favorite.kind === 'unavailable' && <Alert type="warning" showIcon message={t('common.unavailable')} />}
      {state.favorite.kind === 'error' && <Alert type="error" showIcon message={t('common.routeError.description')} />}
      <MonitorMetricResults state={state} actions={actions} />
    </section>
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
    <div className={styles.toolbar}>
      <Select
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
        value={state.history}
        onChange={actions.setHistory}
        options={monitorMetricHistoryRanges.map(value => ({ value, label: value }))}
      />
      <MonitorRefreshSelect value={state.refreshSeconds} onChange={actions.setRefreshSeconds} />
      <Button
        disabled={state.favorite.kind !== 'ready' || state.favoriteBusy}
        loading={state.favoriteBusy}
        onClick={() => void actions.toggleFavorite()}
      >
        {t(favoriteKey)}
      </Button>
      <Button onClick={actions.refresh}>{t('common.refresh')}</Button>
    </div>
  );
}
