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

import { useTranslation } from 'react-i18next';
import { formatShortLocalTimeRange } from '@/shared/time';
import type { LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { LogColumnControls } from '../model/explore-log-columns';
import { liveTraceWindow } from '../model/explore-live-log-model';
import { logBody } from '../model/explore-signal-model';
import { ExploreLogInspector } from './explore-log-inspector';
import { traceAction } from './log-trace-action';
import { useLogSelection } from './use-log-selection';
import styles from './explore-live-log.module.css';
export function UntimedLiveLogs({
  rows,
  query,
  navigate,
  onSelectionChange,
  ...controls
}: LogInspectorFilterControls & {
  onSelectionChange: () => void;
  rows: LogRow[];
  query: LogExploreQuery;
  navigate: (path: string) => void;
  logColumns?: LogColumnControls | undefined;
}) {
  const { t } = useTranslation();
  const {
    selectedRow: row,
    selectedIndex,
    selectedAt,
    selectRow,
    closeInspector
  } = useLogSelection(rows, 'untimed', true, 'preserve', onSelectionChange, true);
  const window = row ? liveTraceWindow(query.timeRange, row, selectedAt!) : undefined;
  if (rows.length === 0 && !row) return null;
  return (
    <section className={styles.untimed} aria-label={t('explore.liveFlow.untimed')}>
      {rows.length > 0 && <p>{t('explore.liveFlow.untimed')}</p>}
      <ul>
        {rows.map((row, index) => (
          <li key={index}>
            <button onClick={() => selectRow(index)}>{logBody(row) ?? t('explore.perses.notRecorded')}</button>
          </li>
        ))}
      </ul>
      {row && window && (
        <ExploreLogInspector
          {...controls}
          id="live-untimed-inspector"
          row={row}
          selectedIndex={selectedIndex}
          rowCount={rows.length}
          scopeHint={`${t('explore.liveFlow.pivotWindow')}: ${formatShortLocalTimeRange(window.from, window.to)}`}
          evidenceCurrent
          onSelectIndex={selectRow}
          onOpenTrace={traceAction(row, query, window, navigate)}
          onClose={() => closeInspector(false)}
        />
      )}
    </section>
  );
}
