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

import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import { useState, type ReactNode } from 'react';
import { Button, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import type { LogColumnControls } from '../model/explore-log-columns';
import { type LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { logInspectorFields } from './explore-log-inspector-model';
import type { LogRow } from '../model/explore-signal-contract';
import { InspectorFields } from './explore-log-inspector-fields';
import fieldStyles from './explore-log-inspector-fields.module.css';
import styles from './explore-log-inspector.module.css';

export type InspectorMode = 'fields' | 'json' | 'context';
type ContentProps = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    context?: ReactNode;
    logColumns?: LogColumnControls | undefined;
    mode: InspectorMode;
    onModeChange: (mode: InspectorMode) => void;
    json: string;
    fields: ReturnType<typeof logInspectorFields>;
    row: LogRow;
    allowCalculatedField?: boolean | undefined;
  };
type PanelProps = Omit<ContentProps, 'onModeChange'> & {
  search: string;
  setSearch: (value: string) => void;
  matchIndex: number;
  setMatchIndex: (value: number) => void;
};

export function InspectorContent({
  context,
  logColumns,
  mode,
  onModeChange,
  json,
  fields,
  row,
  allowCalculatedField,
  logFilterDraft,
  onAddLogFilter,
  logFilterScope,
  logFilterPending,
  onApplyLogFilters,
  ...analysisControls
}: ContentProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const modes: InspectorMode[] = context == null ? ['fields', 'json'] : ['fields', 'json', 'context'];
  return (
    <Tabs
      className={styles.modeTabs ?? ''}
      size="small"
      activeKey={mode}
      onChange={value => onModeChange(value as InspectorMode)}
      destroyOnHidden
      items={modes.map(value => ({
        key: value,
        label: t(value === 'context' ? 'explore.logContext.title' : `explore.perses.${value}View`),
        children: (
          <InspectorPanel
            {...analysisControls}
            context={context}
            logColumns={logColumns}
            mode={value}
            json={json}
            fields={fields}
            row={row}
            allowCalculatedField={allowCalculatedField}
            search={search}
            setSearch={setSearch}
            matchIndex={matchIndex}
            setMatchIndex={setMatchIndex}
            logFilterDraft={logFilterDraft}
            onAddLogFilter={onAddLogFilter}
            logFilterScope={logFilterScope}
            logFilterPending={logFilterPending}
            onApplyLogFilters={onApplyLogFilters}
          />
        )
      }))}
    />
  );
}

function InspectorPanel({
  context,
  logColumns,
  mode,
  json,
  fields,
  row,
  allowCalculatedField,
  search,
  setSearch,
  matchIndex,
  setMatchIndex,
  logFilterDraft,
  onAddLogFilter,
  logFilterScope,
  logFilterPending,
  onApplyLogFilters,
  ...analysisControls
}: PanelProps) {
  return (
    <div className={styles.content}>
      <InspectorToolbar logFilterPending={logFilterPending} onApplyLogFilters={onApplyLogFilters} />
      {mode === 'context' ? (
        context
      ) : mode === 'json' ? (
        <pre className={styles.json}>
          <code>{json}</code>
        </pre>
      ) : (
        <InspectorFields
          logColumns={logColumns}
          fields={fields}
          row={row}
          allowCalculatedField={allowCalculatedField}
          search={search}
          setSearch={setSearch}
          matchIndex={matchIndex}
          setMatchIndex={setMatchIndex}
          logFilterDraft={logFilterDraft}
          logFilterScope={logFilterScope}
          onAddLogFilter={onAddLogFilter}
          {...analysisControls}
        />
      )}
    </div>
  );
}

function InspectorToolbar({
  logFilterPending,
  onApplyLogFilters
}: Pick<LogInspectorFilterControls, 'logFilterPending' | 'onApplyLogFilters'>) {
  const { t } = useTranslation();
  return logFilterPending ? (
    <div className={fieldStyles.pendingFilter} role="status">
      <span>{t('explore.perses.pendingFieldFilters')}</span>
      {onApplyLogFilters && (
        <Button type="primary" onClick={onApplyLogFilters}>
          {t('common.query')}
        </Button>
      )}
    </div>
  ) : null;
}
