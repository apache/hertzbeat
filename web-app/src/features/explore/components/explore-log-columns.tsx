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

import { CloseOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  MAX_LOG_COLUMNS,
  logColumnId,
  logColumnLabel,
  type LogColumn,
  type LogColumnControls
} from '../model/explore-log-columns';
import styles from './explore-log-columns.module.css';

export function ExploreLogColumns({
  controls,
  availableColumns = []
}: {
  controls: LogColumnControls;
  availableColumns?: LogColumn[] | undefined;
}) {
  const { t } = useTranslation();
  const { columns, onColumnsChange } = controls;
  const selectedOptional = columns.filter(column => column.kind !== 'message' && column.kind !== 'time');
  const selectedIds = new Set(columns.map(logColumnId));
  const available = new Map([...availableColumns, ...columns].map(column => [logColumnId(column), column]));
  const optionColumns = [...available.values()].filter(
    column => column.kind !== 'message' && column.kind !== 'time' && !selectedIds.has(logColumnId(column))
  );
  const options = optionColumns.map(column => ({ value: logColumnId(column), label: logColumnLabel(column, t) }));
  const addColumn = (id: string) => {
    const column = available.get(id);
    if (column && columns.length < MAX_LOG_COLUMNS) onColumnsChange([...columns, column]);
  };

  return (
    <div className={styles.options} role="group" aria-label={t('explore.logColumns.title')}>
      <h4>{t('explore.logColumns.title')}</h4>
      <Select
        className={styles.addColumn ?? ''}
        aria-label={t('explore.logColumns.addColumn')}
        placeholder={t('explore.logColumns.addColumn')}
        showSearch
        optionFilterProp="label"
        options={options}
        value={null}
        disabled={columns.length >= MAX_LOG_COLUMNS || !options.length}
        notFoundContent={t('explore.logColumns.noMatches')}
        onChange={addColumn}
      />
      <div className={styles.list}>
        {selectedOptional.map(column => {
          const label = logColumnLabel(column, t);
          return (
            <div className={styles.row} key={logColumnId(column)}>
              <span className={styles.columnLabel}>{label}</span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined aria-hidden />}
                aria-label={t('explore.logColumns.remove', { field: label })}
                onClick={() => onColumnsChange(columns.filter(item => logColumnId(item) !== logColumnId(column)))}
              />
            </div>
          );
        })}
        {!selectedOptional.length && (
          <p className={styles.empty} role="status">
            {t('explore.logColumns.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
