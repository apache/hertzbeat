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

import { Alert, Button, Input, Select, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorStatusFilters, type MonitorQuery } from '../model/monitor-contract';
import type { MonitorAppsEvidence } from '../model/monitor-list-model';

import styles from './monitor-list.module.css';

type MonitorListToolbarActions = {
  setSearch: (value: string) => void;
  setLabels: (value: string) => void;
  submitSearch: () => void;
  submitFilters: () => void;
  changeApp: (value: string) => void;
  changeStatus: (value: string) => void;
  refresh: () => Promise<boolean>;
};

type MonitorListToolbarProps = {
  query: MonitorQuery;
  draft: { search: string; labels: string };
  apps: MonitorAppsEvidence;
  disabled: boolean;
  refreshing: boolean;
  actions: MonitorListToolbarActions;
};

export function MonitorListToolbar(props: MonitorListToolbarProps) {
  const { query, draft, apps, disabled, refreshing, actions } = props;
  return (
    <div className={styles.filterBand} role="search" data-monitor-filter-band="">
      <div className={styles.filterFields}>
        <MonitorFilterFields query={query} draft={draft} apps={apps} disabled={disabled} actions={actions} />
      </div>
      <MonitorFilterActions disabled={disabled} refreshing={refreshing} actions={actions} />
    </div>
  );
}

function MonitorFilterFields({ query, draft, apps, disabled, actions }: Omit<MonitorListToolbarProps, 'refreshing'>) {
  const { t } = useTranslation();
  return (
    <>
      <Input
        value={draft.search}
        allowClear
        disabled={disabled}
        placeholder={t('monitor.search')}
        onChange={event => actions.setSearch(event.target.value)}
        onPressEnter={actions.submitSearch}
      />
      <AppFilter evidence={apps} value={query.app} change={actions.changeApp} disabled={disabled} />
      <Select
        aria-label={t('monitor.status.label')}
        disabled={disabled}
        value={query.status}
        onChange={actions.changeStatus}
        options={[
          { value: monitorStatusFilters.all, label: t('monitor.status.all') },
          { value: monitorStatusFilters.available, label: t('monitor.status.available') },
          { value: monitorStatusFilters.unavailable, label: t('monitor.status.unavailable') },
          { value: monitorStatusFilters.paused, label: t('monitor.status.paused') }
        ]}
      />
      <Input
        value={draft.labels}
        allowClear
        disabled={disabled}
        placeholder={t('labels.filter')}
        onChange={event => actions.setLabels(event.target.value)}
        onPressEnter={actions.submitFilters}
      />
    </>
  );
}

function MonitorFilterActions({
  disabled,
  refreshing,
  actions
}: Pick<MonitorListToolbarProps, 'disabled' | 'refreshing' | 'actions'>) {
  const { t } = useTranslation();
  return (
    <div className={styles.filterActions}>
      <Button type="primary" disabled={disabled} onClick={actions.submitFilters}>
        {t('common.query')}
      </Button>
      <Button
        disabled={disabled || refreshing}
        onClick={() => {
          void actions.refresh();
        }}
      >
        {t('common.refresh')}
      </Button>
    </div>
  );
}

function AppFilter({
  evidence,
  value,
  change,
  disabled
}: {
  evidence: MonitorAppsEvidence;
  value: string;
  change: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  if (evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin size="small" />
      </div>
    );
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  return (
    <Select
      aria-label={t('monitor.application')}
      allowClear
      showSearch
      disabled={disabled}
      optionFilterProp="label"
      placeholder={t('monitor.application')}
      value={value || undefined}
      options={evidence.options}
      onChange={next => change(next ?? '')}
    />
  );
}
