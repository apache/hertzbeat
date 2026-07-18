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

import type { MonitorAppsEvidence } from '../model/monitor-list-model';
import type { MonitorQuery } from '../model/monitor-model';

import styles from './monitor-list.module.css';

export function MonitorListToolbar({ query, draft, apps, refreshing, actions }: {
  query: MonitorQuery; draft: { search: string; labels: string }; apps: MonitorAppsEvidence; refreshing: boolean;
  actions: {
    setSearch: (value: string) => void; setLabels: (value: string) => void; submitSearch: () => void;
    submitFilters: () => void; changeApp: (value: string) => void; changeStatus: (value: string) => void;
    refresh: () => Promise<boolean>; create: () => void;
  };
}) {
  const { t } = useTranslation();
  return <div className={styles.toolbar}>
    <Input value={draft.search} allowClear placeholder={t('monitor.search')}
      onChange={event => actions.setSearch(event.target.value)} onPressEnter={actions.submitSearch} />
    <AppFilter evidence={apps} value={query.app} change={actions.changeApp} />
    <Select aria-label={t('monitor.status.label')} value={query.status} onChange={actions.changeStatus} options={[
      { value: '9', label: t('monitor.status.all') }, { value: '1', label: t('monitor.status.available') },
      { value: '2', label: t('monitor.status.unavailable') }, { value: '0', label: t('monitor.status.paused') }
    ]} />
    <Input value={draft.labels} allowClear placeholder={t('labels.filter')}
      onChange={event => actions.setLabels(event.target.value)} onPressEnter={actions.submitFilters} />
    <Button type="primary" onClick={actions.submitFilters}>{t('common.query')}</Button>
    <Button disabled={refreshing} onClick={() => { void actions.refresh(); }}>{t('common.refresh')}</Button>
    <Button type="primary" onClick={actions.create}>{t('monitor.editor.newTitle')}</Button>
  </div>;
}

function AppFilter({ evidence, value, change }: {
  evidence: MonitorAppsEvidence; value: string; change: (value: string) => void;
}) {
  const { t } = useTranslation();
  if (evidence.kind === 'loading') return <div role="status"><Spin size="small" /></div>;
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  return <Select aria-label={t('monitor.application')} allowClear showSearch optionFilterProp="label"
    placeholder={t('monitor.application')} value={value || undefined} options={evidence.options}
    onChange={next => change(next ?? '')} />;
}
