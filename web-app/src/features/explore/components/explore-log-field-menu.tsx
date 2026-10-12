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

import type { MenuProps } from 'antd';
import type { TFunction } from 'i18next';
import { useContext, useRef, useState, type ContextType } from 'react';
import { useTranslation } from 'react-i18next';
import { inspectorCalculatedExpression } from '../model/explore-log-calculated-field-expression';
import { MAX_LOG_COLUMNS, logColumnId, logColumnLabel, type LogColumnControls } from '../model/explore-log-columns';
import type { LogInspectorAnalysisControls } from '../model/explore-log-inspector-analysis';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { LogRow } from '../model/explore-signal-contract';
import { useEvidenceCopy } from './explore-evidence-copy';
import { useLogCalculatedFromField } from './explore-log-calculated-from-field-context';
import { LogFacetVisibilityContext } from './explore-log-facet-visibility-context';
import { logAnalysisMenuItems } from './explore-log-field-analysis-menu';
import { LogFieldDropdown } from './explore-log-field-dropdown';
import { logFilterMenuItems } from './explore-log-field-filter-menu';
import styles from './explore-log-inspector-fields.module.css';
import type { InspectorField } from './explore-log-inspector-model';

type Props = LogInspectorFilterControls &
  LogInspectorAnalysisControls & {
    field: InspectorField;
    row?: LogRow;
    logColumns?: LogColumnControls | undefined;
    allowCalculatedField?: boolean | undefined;
  };
export function LogFieldMenu({ field, row, logColumns, allowCalculatedField, ...controls }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { copy, status } = useEvidenceCopy(field.value ?? '');
  const facets = useContext(LogFacetVisibilityContext);
  const { copy: copyKeyValue, status: keyValueStatus } = useEvidenceCopy(`${field.key}:${field.value ?? 'null'}`);
  const actionLabel = t('explore.logFieldMenu.actions', {
    field: logColumns && field.column ? logColumnLabel(field.column, t) : field.key
  });
  const calculated = useLogCalculatedFromField();
  const expression = inspectorCalculatedExpression(field);
  const canCalculate = Boolean(allowCalculatedField !== false && calculated?.enabled && row && expression);
  const items = menuItems(
    field,
    controls,
    logColumns,
    facets,
    t,
    () => setOpen(false),
    copy,
    copyKeyValue,
    canCalculate,
    () => {
      if (expression && row) {
        calculated?.open(expression, row);
        setOpen(false);
      }
    }
  );
  return (
    <>
      <LogFieldDropdown {...{ open, trigger, items, actionLabel }} onOpenChange={setOpen} />
      <span role="status" className={styles.copyAnnouncement}>
        {status !== 'idle'
          ? t(`explore.logFieldMenu.${status}`)
          : keyValueStatus !== 'idle'
            ? t(`explore.logFieldMenu.${keyValueStatus}`)
            : ''}
      </span>
    </>
  );
}

function menuItems(
  field: InspectorField,
  controls: LogInspectorFilterControls & LogInspectorAnalysisControls,
  logColumns: LogColumnControls | undefined,
  facets: ContextType<typeof LogFacetVisibilityContext>,
  t: TFunction,
  close: () => void,
  copy: () => Promise<void>,
  copyKeyValue: () => Promise<void>,
  canCalculate: boolean,
  calculate: () => void
): NonNullable<MenuProps['items']> {
  const items: NonNullable<MenuProps['items']> = [
    {
      key: 'copy',
      label: t('explore.logFieldMenu.copy'),
      disabled: field.value === null,
      onClick: () => {
        void copy();
      }
    },
    {
      key: 'copy-key-value',
      label: t('explore.logFieldMenu.copyKeyValue'),
      onClick: () => {
        void copyKeyValue();
      }
    },
    { type: 'divider' },
    ...logFilterMenuItems(field, controls, t),
    ...logAnalysisMenuItems(field, controls, t, close)
  ];
  if (canCalculate) {
    items.push({ key: 'calculate-field', label: t('explore.logFieldMenu.calculateField'), onClick: calculate });
  }
  const column = columnItem(field, logColumns, t);
  if (column) items.push(column);
  const facet = field.analysis?.field;
  if (facet && facets) {
    const available = facets.availableFacetIds.includes(facet.id);
    items.push({
      key: 'add-to-filter-rail',
      disabled: !available,
      label: (
        <span>
          {t('explore.logFieldMenu.addToFilterRail')}
          {!available && <small className={styles.menuReason}>{t('explore.logFieldMenu.facetUnavailable')}</small>}
        </span>
      ),
      onClick: () => facets.onAddFacet(facet)
    });
  }
  return items;
}

function columnItem(
  field: InspectorField,
  logColumns: LogColumnControls | undefined,
  t: TFunction
): NonNullable<MenuProps['items']>[number] {
  const column = field.column;
  if (column && logColumns) {
    const exists = logColumns.columns.some(item => logColumnId(item) === logColumnId(column));
    const disabled = exists ? column.kind === 'message' : logColumns.columns.length >= MAX_LOG_COLUMNS;
    return {
      key: 'column',
      disabled,
      label: t(exists ? 'explore.logFieldMenu.removeColumn' : 'explore.logColumns.add'),
      onClick: () =>
        logColumns.onColumnsChange(
          exists
            ? logColumns.columns.filter(item => logColumnId(item) !== logColumnId(column))
            : [...logColumns.columns, column]
        )
    };
  }
  return null;
}
