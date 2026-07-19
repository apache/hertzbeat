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

import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from '../alert-center-page.module.css';
import {
  alertSeverities,
  alertStatusFilters,
  type AlertQuery,
  type AlertSeverity,
  type AlertStatusFilter
} from '../alert-model';
import type { AlertDraftField, AlertFilterDraft } from '../model/alert-center-view-model';

type AlertCenterToolbarProps = {
  draft: AlertFilterDraft;
  query: AlertQuery;
  refreshing: boolean;
  onDraftChange: (field: AlertDraftField, value: string) => void;
  onSubmit: () => void;
  onStatusChange: (status: AlertStatusFilter) => void;
  onSeverityChange: (severity: AlertSeverity) => void;
  onRefresh: () => unknown;
};

export function AlertCenterToolbar({
  draft,
  query,
  refreshing,
  onDraftChange,
  onSubmit,
  onStatusChange,
  onSeverityChange,
  onRefresh
}: AlertCenterToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <AlertScopeFilterFields draft={draft} onDraftChange={onDraftChange} onSubmit={onSubmit} />
      <Select<AlertStatusFilter>
        value={query.status}
        onChange={onStatusChange}
        options={['', ...alertStatusFilters].map(value => ({
          value,
          label: t(value ? `alert.status.${value}` : 'alert.status.all')
        }))}
      />
      <Select<AlertSeverity>
        value={query.severity}
        onChange={onSeverityChange}
        options={['', ...alertSeverities].map(value => ({
          value,
          label: t(value ? `alert.severity.${value}` : 'alert.severity.all')
        }))}
      />
      <Button type="primary" onClick={onSubmit}>
        {t('common.query')}
      </Button>
      <Button
        loading={refreshing}
        onClick={() => {
          void onRefresh();
        }}
      >
        {t('common.refresh')}
      </Button>
    </div>
  );
}

type AlertScopeFilterFieldsProps = {
  draft: AlertFilterDraft;
  onDraftChange: (field: AlertDraftField, value: string) => void;
  onSubmit: () => void;
};

function AlertScopeFilterFields({ draft, onDraftChange, onSubmit }: AlertScopeFilterFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Input
        allowClear
        value={draft.search}
        placeholder={t('alert.search')}
        onChange={event => onDraftChange('search', event.target.value)}
        onPressEnter={onSubmit}
      />
      <Input
        allowClear
        value={draft.serviceName}
        placeholder={t('instrumentation.field.serviceName')}
        onChange={event => onDraftChange('serviceName', event.target.value)}
        onPressEnter={onSubmit}
      />
      <Input
        allowClear
        value={draft.serviceNamespace}
        placeholder={t('instrumentation.field.serviceNamespace')}
        onChange={event => onDraftChange('serviceNamespace', event.target.value)}
        onPressEnter={onSubmit}
      />
      <Input
        allowClear
        value={draft.environment}
        placeholder={t('instrumentation.field.serviceEnvironment')}
        onChange={event => onDraftChange('environment', event.target.value)}
        onPressEnter={onSubmit}
      />
    </>
  );
}
