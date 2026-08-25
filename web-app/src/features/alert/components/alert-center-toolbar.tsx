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

import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar } from '@/shared/operational-page/operational-page';

import styles from '../shared/alert-center.module.css';
import { alertSeverities, alertStatusFilters, type AlertSeverity, type AlertStatusFilter } from '../model/alert-model';
import type { AlertDraftField, AlertFilterDraft } from '../model/alert-center-view-model';

type AlertCenterToolbarProps = {
  draft: AlertFilterDraft;
  disabled: boolean;
  refreshing: boolean;
  onDraftChange: (field: AlertDraftField, value: string) => void;
  onSubmit: () => void;
  onRefresh: () => unknown;
};

export function AlertCenterToolbar({
  draft,
  disabled,
  refreshing,
  onDraftChange,
  onSubmit,
  onRefresh
}: AlertCenterToolbarProps) {
  const { t } = useTranslation();
  const advancedId = useId();
  const advancedCount = countAdvancedFilters(draft);
  const [advancedOpen, setAdvancedOpen] = useState(advancedCount > 0);

  return (
    <OperationalCommandBar
      role="search"
      ariaLabel={t('alert.search')}
      primary={
        <div className={styles.toolbar} data-alert-filter-workbench>
          <AlertPrimaryFilters
            advancedCount={advancedCount}
            advancedId={advancedId}
            advancedOpen={advancedOpen}
            disabled={disabled}
            draft={draft}
            onAdvancedToggle={() => setAdvancedOpen(open => !open)}
            onDraftChange={onDraftChange}
            onSubmit={onSubmit}
          />
          <div
            id={advancedId}
            aria-hidden={!advancedOpen}
            className={styles.advancedFilters}
            data-open={advancedOpen}
            data-testid="alert-advanced-filters"
            inert={!advancedOpen}
          >
            <AlertScopeFilterFields
              disabled={disabled}
              draft={draft}
              onDraftChange={onDraftChange}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      }
      secondary={
        <>
          <Button className={styles.queryButton ?? ''} type="primary" disabled={disabled} onClick={onSubmit}>
            {t('common.query')}
          </Button>
          <Button
            className={styles.refreshButton ?? ''}
            loading={refreshing}
            disabled={disabled}
            onClick={() => {
              void onRefresh();
            }}
          >
            {t('common.refresh')}
          </Button>
        </>
      }
    />
  );
}

type AlertPrimaryFiltersProps = Pick<AlertCenterToolbarProps, 'disabled' | 'draft' | 'onDraftChange' | 'onSubmit'> & {
  advancedCount: number;
  advancedId: string;
  advancedOpen: boolean;
  onAdvancedToggle: () => void;
};

function AlertPrimaryFilters({
  advancedCount,
  advancedId,
  advancedOpen,
  disabled,
  draft,
  onAdvancedToggle,
  onDraftChange,
  onSubmit
}: AlertPrimaryFiltersProps) {
  const { t } = useTranslation();
  let disclosureLabel = t('alert.filters.more');
  if (advancedOpen) disclosureLabel = t('alert.filters.less');
  else if (advancedCount > 0) disclosureLabel = t('alert.filters.moreActive', { count: advancedCount });

  return (
    <div className={styles.primaryFilters}>
      <Input
        allowClear
        aria-label={t('alert.search')}
        className={styles.searchInput}
        disabled={disabled}
        prefix={<SearchOutlined aria-hidden />}
        value={draft.search}
        placeholder={t('alert.search')}
        onChange={event => onDraftChange('search', event.target.value)}
        onPressEnter={onSubmit}
      />
      <Select<AlertStatusFilter>
        aria-label={t('alert.status.label')}
        className={styles.filterSelect ?? ''}
        disabled={disabled}
        value={draft.status}
        onChange={value => onDraftChange('status', value)}
        options={['', ...alertStatusFilters].map(value => ({
          value,
          label: t(value ? `alert.status.${value}` : 'alert.status.all')
        }))}
      />
      <Select<AlertSeverity>
        aria-label={t('alert.severity.label')}
        className={styles.filterSelect ?? ''}
        disabled={disabled}
        value={draft.severity}
        onChange={value => onDraftChange('severity', value)}
        options={['', ...alertSeverities].map(value => ({
          value,
          label: t(value ? `alert.severity.${value}` : 'alert.severity.all')
        }))}
      />
      <Button
        aria-controls={advancedId}
        aria-expanded={advancedOpen}
        className={`${styles.disclosure} ${advancedOpen ? styles.disclosureOpen : ''}`}
        disabled={disabled}
        icon={<DownOutlined aria-hidden />}
        type="text"
        onClick={onAdvancedToggle}
      >
        {disclosureLabel}
      </Button>
    </div>
  );
}

type AlertScopeFilterFieldsProps = {
  disabled: boolean;
  draft: AlertFilterDraft;
  onDraftChange: (field: AlertDraftField, value: string) => void;
  onSubmit: () => void;
};

function AlertScopeFilterFields({ disabled, draft, onDraftChange, onSubmit }: AlertScopeFilterFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.advancedInner}>
      <AlertScopeField
        disabled={disabled}
        label={t('instrumentation.field.serviceName')}
        value={draft.serviceName}
        onChange={value => onDraftChange('serviceName', value)}
        onSubmit={onSubmit}
      />
      <AlertScopeField
        disabled={disabled}
        label={t('instrumentation.field.serviceNamespace')}
        value={draft.serviceNamespace}
        onChange={value => onDraftChange('serviceNamespace', value)}
        onSubmit={onSubmit}
      />
      <AlertScopeField
        disabled={disabled}
        label={t('instrumentation.field.serviceEnvironment')}
        value={draft.environment}
        onChange={value => onDraftChange('environment', value)}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function AlertScopeField({
  disabled,
  label,
  value,
  onChange,
  onSubmit
}: {
  disabled: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <label className={styles.advancedField}>
      <span className={styles.advancedLabel}>{label}</span>
      <Input
        allowClear
        aria-label={label}
        disabled={disabled}
        value={value}
        placeholder={label}
        onChange={event => onChange(event.target.value)}
        onPressEnter={onSubmit}
      />
    </label>
  );
}

function countAdvancedFilters(draft: AlertFilterDraft) {
  return [draft.serviceName, draft.serviceNamespace, draft.environment].filter(Boolean).length;
}
