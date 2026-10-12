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

import { Button, Dropdown, Select } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DownOutlined, UndoOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';
import type { LogExploreQuery } from '../model/explore-query';
import { logColumnLabel, type LogColumn } from '../model/explore-log-columns';
import {
  logOrderLabel,
  logSortField,
  isLogSortPending,
  type LogFieldSort,
  type LogSortControls
} from '../model/explore-log-order';
import styles from './explore-log-order.module.css';
export function ExploreLogOrderHeader({
  column,
  controls,
  t,
  live = false,
  direction,
  labelOverride
}: {
  column: LogColumn;
  controls?: LogSortControls | undefined;
  t: TFunction;
  live?: boolean;
  direction?: 'ascending' | 'descending' | undefined;
  labelOverride?: string | undefined;
}) {
  const label = labelOverride ?? logColumnLabel(column, t);
  if (live) return <span title={t('explore.logSort.historyOnly')}>{label}</span>;
  const field = logSortField(column);
  if (!controls || (column.kind !== 'time' && !field))
    return <span title={t('explore.logSort.unavailable')}>{label}</span>;
  const choices = sortChoices(column.kind === 'time', Boolean(field?.startsWith('builtin:')));
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: choices.map(key => ({ key, label: orderChoiceLabel(key, t) })),
        onClick: ({ key }) => {
          if (key === 'newest' || key === 'oldest') controls.change(undefined, key);
          else {
            const [type, direction] = key.split(':') as [LogFieldSort['type'], LogFieldSort['direction']];
            controls.change(JSON.stringify({ version: 1, field, type, direction }), 'newest');
          }
        }
      }}
    >
      <button
        type="button"
        className={styles.header}
        title={t('explore.logSort.hint')}
        aria-label={t('explore.logSort.menu', { field: label })}
      >
        {label}
        <span aria-hidden>
          {direction === 'ascending' && <ArrowUpOutlined />}
          {direction === 'descending' && <ArrowDownOutlined />}
          {!direction && <DownOutlined />}
        </span>
      </button>
    </Dropdown>
  );
}
export function ExploreCalculatedSortHeader({
  name,
  type,
  controls,
  t,
  direction
}: {
  name: string;
  type: 'number' | 'string' | 'boolean';
  controls?: LogSortControls | undefined;
  t: TFunction;
  direction?: 'ascending' | 'descending' | undefined;
}) {
  const label = `#${name}`;
  if (!controls) return <span>{label}</span>;
  const sortType = type === 'number' ? 'number' : 'text';
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: (['asc', 'desc'] as const).map(value => ({
          key: value,
          label: orderChoiceLabel(`${sortType}:${value}`, t)
        })),
        onClick: ({ key }) =>
          controls.change(
            JSON.stringify({
              version: 1,
              field: `calculated:${name}`,
              type: sortType,
              direction: key
            }),
            'newest'
          )
      }}
    >
      <button
        type="button"
        className={styles.header}
        title={t('explore.logSort.hint')}
        aria-label={t('explore.logSort.menu', { field: label })}
      >
        {label}
        <span aria-hidden>
          {direction === 'ascending' && <ArrowUpOutlined />}
          {direction === 'descending' && <ArrowDownOutlined />}
          {!direction && <DownOutlined />}
        </span>
      </button>
    </Dropdown>
  );
}
function orderChoiceLabel(key: string, t: TFunction) {
  if (key === 'newest' || key === 'oldest') return t(`explore.logColumns.${key}`);
  const [type, direction] = key.split(':');
  return t(`explore.logSort.${type}${direction === 'asc' ? 'Asc' : 'Desc'}`);
}
export function ExploreLogOrderControls({
  query,
  controls,
  t
}: {
  query: LogExploreQuery;
  controls?: LogSortControls | undefined;
  t: TFunction;
}) {
  const draft = controls?.draft ?? query;
  const pending = isLogSortPending(draft, query);
  return (
    <div className={styles.controls}>
      <Select
        title={`${logOrderLabel(draft.logSort, draft.sort, t)} — ${t('explore.logSort.hint')}`}
        aria-label={t('explore.logColumns.sort')}
        disabled={query.live || !controls}
        value={draft.logSort ? 'field' : (draft.sort ?? 'newest')}
        onChange={sort => {
          if (sort === 'newest' || sort === 'oldest') controls?.change(undefined, sort);
        }}
        options={[
          ...(['newest', 'oldest'] as const).map(value => ({ value, label: t(`explore.logColumns.${value}`) })),
          ...(draft.logSort
            ? [{ value: 'field', label: logOrderLabel(draft.logSort, draft.sort, t), disabled: true }]
            : [])
        ]}
      />
      <LogOrderStatus query={query} controls={controls} draft={draft} pending={pending} t={t} />
    </div>
  );
}

function sortChoices(timestamp: boolean, builtin: boolean) {
  if (timestamp) return ['newest', 'oldest'];
  if (builtin) return ['text:asc', 'text:desc'];
  return ['number:asc', 'number:desc', 'text:asc', 'text:desc'];
}
function LogOrderStatus({
  query,
  controls,
  draft,
  pending,
  t
}: {
  query: LogExploreQuery;
  controls: LogSortControls | undefined;
  draft: LogSortControls['draft'];
  pending: boolean;
  t: TFunction;
}) {
  const pendingDescription = t('explore.logSort.pending', {
    value: logOrderLabel(draft.logSort, draft.sort, t)
  });
  const appliedDescription = t('explore.logSort.applied', {
    value: logOrderLabel(query.logSort, query.sort, t)
  });
  return (
    <>
      {pending && !query.live && (
        <span className={styles.pending}>
          <span role="status" title={`${pendingDescription} ${appliedDescription}`}>
            {t('explore.logSort.pendingShort')}
          </span>
          <Button
            type="text"
            icon={<UndoOutlined />}
            aria-label={t('explore.logSort.reset')}
            title={t('explore.logSort.reset')}
            onClick={() => controls?.change(query.logSort, query.sort === 'oldest' ? 'oldest' : 'newest')}
          />
        </span>
      )}
      {query.live && <span>{t('explore.logSort.historyOnly')}</span>}
    </>
  );
}
