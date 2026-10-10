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

import { Checkbox, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { LogScopeSuggestion, LogScopeSuggestions } from '../model/explore-log-scope-suggestions';
import { LOG_SEVERITY_CATEGORIES } from '../model/explore-query';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';
import { TextField, SelectField } from './explore-log-query-fields';
import styles from './explore-log-query-builder.module.css';
type Props = Pick<ExploreSubmissionViewModel, 'updateField'> & { draft: LogExploreSubmissionDraft; t: TFunction };

export function LogScopeFields({
  draft,
  t,
  updateField,
  suggestions
}: Props & { suggestions?: LogScopeSuggestions | undefined }) {
  return (
    <div className={styles.scopeFields}>
      <div className={styles.scopeGrid}>
        <TextField
          label={t('explore.serviceName')}
          placeholder={t('explore.logQueryBuilder.serviceNameExample')}
          suggestions={suggestions?.serviceName.values}
          suggestionStatus={suggestionMessage(suggestions?.serviceName, t)}
          value={draft.serviceName}
          onChange={value => updateField({ field: 'serviceName', value })}
        />
        <TextField
          label={t('explore.environment')}
          placeholder={t('explore.logQueryBuilder.environmentExample')}
          suggestions={suggestions?.environment.values}
          suggestionStatus={suggestionMessage(suggestions?.environment, t)}
          value={draft.environment}
          onChange={value => updateField({ field: 'environment', value })}
        />
        <SelectField
          label={t('explore.severity')}
          placeholder={t('explore.logQueryBuilder.severityPlaceholder')}
          value={draft.severityCategory ?? ''}
          options={[...LOG_SEVERITY_CATEGORIES]}
          onChange={value => updateField({ field: 'severityCategory', value })}
        />
      </div>
      <MoreLogFilters draft={draft} t={t} updateField={updateField} />
      {(suggestions?.serviceName.state === 'ready' || suggestions?.environment.state === 'ready') && (
        <small style={{ gridColumn: '1 / -1' }}>{t('exploreLog.scopeSuggestions.hint')}</small>
      )}
    </div>
  );
}

function MoreLogFilters({ draft, t, updateField }: Props) {
  const [open, setOpen] = useState(false);
  const count = [draft.serviceNamespace, draft.traceId, draft.spanId, draft.severityText].filter(value =>
    value.trim()
  ).length;
  return (
    <details className={styles.moreFilters} open={open}>
      <summary
        onClick={event => {
          event.preventDefault();
          setOpen(!open);
        }}
      >
        <span>{t('explore.advancedFilters')}</span>
        {count > 0 && <span className={styles.filterCount}>{count}</span>}
      </summary>
      <div className={styles.rareGrid}>
        <TextField
          label={t('explore.originalSeverity')}
          placeholder={t('explore.originalSeverity')}
          value={draft.severityText}
          onChange={value => updateField({ field: 'severityText', value })}
        />{' '}
        <TextField
          label={t('explore.serviceNamespace')}
          placeholder={t('explore.logQueryBuilder.namespaceExample')}
          value={draft.serviceNamespace}
          onChange={value => updateField({ field: 'serviceNamespace', value })}
        />
        <TextField
          label={t('explore.traceId')}
          placeholder={t('explore.logQueryBuilder.traceIdExample')}
          value={draft.traceId}
          onChange={value => updateField({ field: 'traceId', value })}
        />
        <TextField
          label={t('explore.spanId')}
          placeholder={t('explore.logQueryBuilder.spanIdExample')}
          value={draft.spanId}
          onChange={value => updateField({ field: 'spanId', value })}
        />
      </div>
    </details>
  );
}
export function VisibilityFilters({
  draft,
  t,
  updateField,
  compact = false
}: Pick<Props, 'draft' | 't' | 'updateField'> & { compact?: boolean }) {
  return (
    <div
      className={[styles.visibility, compact && styles.compactVisibility].filter(Boolean).join(' ')}
      role="group"
      aria-label={t('explore.logQueryBuilder.visibility')}
    >
      <Checkbox
        checked={draft.hideInternal}
        disabled={draft.source === 'self'}
        onChange={event => updateField({ field: 'hideInternal', value: event.target.checked })}
      >
        {t('exploreLog.hideInternal')}
      </Checkbox>
      <Checkbox
        checked={draft.hideNoise}
        onChange={event => updateField({ field: 'hideNoise', value: event.target.checked })}
      >
        {t('exploreLog.hideNoise')}
      </Checkbox>
      <Tooltip title={t('exploreLog.visibilityHint')} trigger={['hover', 'focus']}>
        <QuestionCircleOutlined tabIndex={0} aria-label={t('exploreLog.visibilityHint')} />
      </Tooltip>
    </div>
  );
}

function suggestionMessage(value: LogScopeSuggestion | undefined, t: TFunction) {
  if (!value || value.state === 'idle') return undefined;
  if (value.state === 'loading') return t('common.loading');
  if (value.state === 'error') return t('exploreLog.scopeSuggestions.unavailable');
  if (value.state === 'empty') return t('exploreLog.scopeSuggestions.empty');
  return undefined;
}
