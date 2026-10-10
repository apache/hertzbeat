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

import { Input, Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LogFacetField } from '../model/explore-log-facets';
import type { FacetValuesProps } from './explore-log-facet-types';
import { FacetReadState } from './explore-log-facet-state';
import styles from './explore-log-facets.module.css';

export function FacetValues(props: FacetValuesProps) {
  const { t } = useTranslation();
  const { data, ready, items } = facetValues(props);
  return (
    <>
      <Input
        allowClear
        maxLength={256}
        aria-label={`${props.fieldLabel} ${t('explore.logFacets.search')}`}
        placeholder={t('explore.logFacets.search')}
        value={props.valueSearch}
        onChange={event => props.onValueSearchChange(event.target.value)}
      />
      <FacetReadState state={props.values.state} unavailable={data?.state === 'unavailable'} onRetry={props.onRetry} />
      {ready && data && (
        <>
          {props.values.state !== 'ready' && (
            <p role="status">
              {t(props.values.state === 'loading' ? 'explore.logFacets.refreshing' : 'explore.logFacets.stale')}
            </p>
          )}
          {data.search && <p>{t('explore.logFacets.searchMatches', { count: data.search.matchedCount })}</p>}
          <ul className={styles.values} aria-label={t('explore.logFacets.population', { count: data.matchedCount })}>
            {items.map(item => (
              <FacetValue
                key={item.value}
                enabled={props.values.state === 'ready'}
                field={data.field}
                fieldLabel={props.fieldLabel}
                value={item.value}
                count={item.count}
                actionForValue={props.actionForValue}
              />
            ))}
          </ul>
          {!items.length && <p role="status">{t('explore.logFacets.empty')}</p>}
          {data.missingOrNullCount !== null && data.missingOrNullCount > 0 && (
            <p>{t('explore.logFacets.missing', { count: data.missingOrNullCount })}</p>
          )}
          {data.truncated && <p>{t(data.search ? 'explore.logFacets.searchLimited' : 'explore.logFacets.limited')}</p>}
        </>
      )}
    </>
  );
}
function FacetValue({
  enabled,
  field,
  fieldLabel,
  value,
  count,
  actionForValue
}: Pick<FacetValuesProps, 'actionForValue'> & {
  enabled: boolean;
  field: LogFacetField;
  fieldLabel: string;
  value: string;
  count: number;
}) {
  const { t } = useTranslation();
  const label = value === '' ? t('explore.logFacets.emptyString') : value;
  const include = actionForValue(field, value, '=', 'toggle');
  const single = actionForValue(field, value, '=', 'single');
  return (
    <FacetValueRow
      label={label}
      fieldLabel={fieldLabel}
      count={count}
      enabled={enabled}
      include={include}
      single={single}
    />
  );
}

export function FacetValueRow({
  label,
  fieldLabel = label,
  count,
  enabled,
  include,
  single
}: {
  label: string;
  fieldLabel?: string;
  count: number;
  enabled: boolean;
  include: ReturnType<FacetValuesProps['actionForValue']>;
  single: ReturnType<FacetValuesProps['actionForValue']>;
}) {
  const { t } = useTranslation();
  return (
    <li>
      <ActionTooltip action={include} enabled={enabled} className={styles.includeAction}>
        <input
          type="checkbox"
          checked={include.selected}
          disabled={!enabled || include.disabled}
          aria-label={t('explore.logFacets.include', { value: label })}
          onChange={include.onClick}
        />
      </ActionTooltip>
      <ActionTooltip action={single} enabled={enabled} className={styles.value}>
        <button
          type="button"
          title={label}
          disabled={!enabled || single.disabled}
          aria-pressed={single.selected}
          aria-label={t('explore.logFacets.onlyOrAll', { field: fieldLabel, value: label })}
          onClick={single.onClick}
        >
          {label}
        </button>
      </ActionTooltip>
      <span>{count.toLocaleString()}</span>
    </li>
  );
}

function ActionTooltip({
  action,
  enabled,
  className,
  children
}: {
  action: ReturnType<FacetValuesProps['actionForValue']>;
  enabled: boolean;
  className: string | undefined;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const reasonKeys = {
    'legacy-value': 'explore.logFieldMenu.legacyValue',
    'literal-query-exclusion': 'explore.logFieldMenu.literalQueryExclusion',
    'pending-query': 'explore.logFieldMenu.pendingQuery'
  };
  const disabled = !enabled || action.disabled;
  const reason = disabled
    ? t(action.reason ? reasonKeys[action.reason] : 'explore.logFacets.unavailableAction')
    : undefined;
  return (
    <Tooltip title={reason} trigger={['hover', 'focus']}>
      <span
        className={className}
        tabIndex={disabled ? 0 : undefined}
        role={disabled ? 'group' : undefined}
        aria-description={reason}
      >
        {children}
      </span>
    </Tooltip>
  );
}

function facetValues(props: FacetValuesProps) {
  const data = ['permission', 'idle', 'unavailable'].includes(props.values.state) ? undefined : props.values.data;
  const ready = data?.state === 'ready' && data.field.id === props.fieldId;
  const items = ready ? data.values : [];
  return { data, ready, items };
}
