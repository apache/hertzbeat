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

import { useMemo, useState, type ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { LiveLogRow } from '../model/explore-signal-contract';
import type { LogInspectorFilterControls } from '../model/explore-log-inspector-filter';
import type { LogColumnControls } from '../model/explore-log-columns';
import type { ExploreLogDisplayPreferences } from '../model/explore-log-display-preferences';
import type { HertzBeatLogCopyLabels } from '@/platform/perses';
import { exploreEvidenceScopeKey, type LogExploreQuery } from '../model/explore-model';
import { createLiveLogMapper, liveBufferWindow } from '../model/explore-live-log-model';
import { SelectablePersesLogTable } from './explore-selectable-log-table';
import { UntimedLiveLogs } from './explore-untimed-live-logs';
import { logTimestampMs } from '../model/explore-signal-model';
import styles from './explore-live-log.module.css';
import { SignalResultFrame } from './signal-result-frame';
export type LiveLogTableControls = LogInspectorFilterControls & {
  logColumns?: LogColumnControls | undefined;
  logDisplay?:
    | (ExploreLogDisplayPreferences & {
        copyLabels?: HertzBeatLogCopyLabels | undefined;
        onShowTimeChange?: ((show: boolean) => void) | undefined;
        onShowContentChange?: ((show: boolean) => void) | undefined;
      })
    | undefined;
  evidenceIdentity?: string | undefined;
};
type Props = LiveLogTableControls & {
  rows: LiveLogRow[];
  query: LogExploreQuery;
  t: TFunction;
  navigate: (path: string) => void;
  connection?: ReactNode | undefined;
  actions?: ReactNode | undefined;
};
export function LogRows({ rows, query, t, navigate, connection, actions, ...controls }: Props) {
  const [selectionReset, setSelectionReset] = useState({ timed: 0, untimed: 0 });
  const [map] = useState(createLiveLogMapper);
  const mapped = useMemo(() => rows.map(map), [rows, map]);
  const timed = mapped.filter(row => logTimestampMs(row) != null);
  const untimed = mapped.filter(row => logTimestampMs(row) == null);
  const currentWindow = liveBufferWindow(timed);
  const [lastWindow, setLastWindow] = useState(currentWindow);
  if (currentWindow && (currentWindow.from !== lastWindow?.from || currentWindow.to !== lastWindow?.to)) {
    setLastWindow(currentWindow);
  }
  // Keep the selection owner mounted when arrivals evict an entire timestamp category.
  const timeWindow = currentWindow ?? lastWindow;
  const liveQuery = { ...query, live: true, sort: undefined };
  return (
    <SignalResultFrame
      title={t('exploreLog.live')}
      count={rows.length}
      meta={[{ label: t('exploreLog.streamStatus'), value: connection }]}
      actions={actions}
    >
      {mapped.length > 0 && timeWindow && (
        <div className={styles.table}>
          <SelectablePersesLogTable
            selectionReset={selectionReset.timed}
            onSelectionChange={() => setSelectionReset(value => ({ ...value, untimed: value.untimed + 1 }))}
            {...controls}
            rows={timed}
            query={liveQuery}
            timeWindow={timeWindow}
            runtimeIdentity={controls.evidenceIdentity ?? exploreEvidenceScopeKey(query)}
            persesQuery={{ signal: 'logs', queryKind: 'table', timeWindow, limit: 500 }}
            persesOutcome={{ state: 'ready', truncated: false, data: { rows: timed, total: timed.length } }}
            logDisplay={controls.logDisplay}
            evidenceCurrent
            openPath={navigate}
          />
        </div>
      )}
      {mapped.length > 0 && (
        <UntimedLiveLogs
          key={`${controls.evidenceIdentity ?? exploreEvidenceScopeKey(query)}:${selectionReset.untimed}`}
          onSelectionChange={() => setSelectionReset(value => ({ ...value, timed: value.timed + 1 }))}
          {...controls}
          rows={untimed}
          query={liveQuery}
          navigate={navigate}
        />
      )}
    </SignalResultFrame>
  );
}
