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

import { Button, Checkbox, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorListViewState, MonitorListViewActions } from '../model/monitor-list-model';
import { isMonitorRowDisappeared } from '../model/monitor-list-snapshot';
import styles from './monitor-list.module.css';

export function MonitorPageSelection({
  state,
  actions,
  position
}: {
  state: MonitorListViewState;
  actions: Pick<MonitorListViewActions, 'selectIds' | 'clearSelection'>;
  position: 'top' | 'bottom';
}) {
  const { t } = useTranslation();
  if (!state.capabilities.canSelect) return null;
  const ids =
    state.monitors.kind === 'ready'
      ? state.monitors.records.filter(row => !isMonitorRowDisappeared(row)).map(row => row.id)
      : [];
  const selected = new Set(state.selectedIds);
  const count = ids.filter(id => selected.has(id)).length;
  const checked = ids.length > 0 && count === ids.length;
  const label = t(checked ? 'common.tableSelection.clearAll' : 'common.tableSelection.selectAll');
  return (
    <div className={styles.pageSelection} data-monitor-page-selection={position}>
      <Checkbox
        checked={checked}
        indeterminate={count > 0 && !checked}
        disabled={state.operating || ids.length === 0}
        aria-label={label}
        onChange={event => actions.selectIds(event.target.checked ? ids : [])}
      >
        {label}
      </Checkbox>
      {position === 'bottom' && count > 0 ? (
        <>
          <Typography.Text>{t('monitorActions.selected', { count })}</Typography.Text>
          <Button disabled={state.operating} onClick={actions.clearSelection}>
            {t('monitorActions.clearSelection')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
