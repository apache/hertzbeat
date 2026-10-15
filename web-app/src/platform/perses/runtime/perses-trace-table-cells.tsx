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

import type { TFunction } from 'i18next';
import type { TraceEvidence } from '@/shared/trace-evidence';
import { traceName, type TraceTableHost } from './perses-trace-table-model';
import styles from './perses-trace-table.module.css';

export function TraceNameCell({
  row,
  host,
  focused,
  t
}: {
  row: TraceEvidence;
  host: TraceTableHost;
  focused: boolean;
  t: TFunction;
}) {
  const href = host.links?.[row.traceId];
  const label = traceName(row, t);
  const operation =
    (row.rootState === 'unique' ? row.rootSpanName : row.representativeSpan.spanName) ||
    t('explore.perses.traceTable.unnamedSpan');
  const metadata = host.unavailableLinks?.[row.traceId] ?? traceMetadata(row, t);
  return (
    <div className={styles.name}>
      {href ? (
        <a
          href={href}
          tabIndex={focused ? 0 : -1}
          title={label + ' · ' + row.traceId}
          aria-label={t('explore.perses.traceTable.investigate', { name: label, traceId: row.traceId })}
          onClick={event => {
            if (
              host.onNavigate &&
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              host.onNavigate(href);
            }
          }}
        >
          {operation}
        </a>
      ) : (
        <span title={label + ' · ' + row.traceId}>{operation}</span>
      )}
      <span className={styles.meta} title={metadata}>
        {metadata}
      </span>
    </div>
  );
}

function traceMetadata(row: TraceEvidence, t: TFunction) {
  const structural =
    row.rootState === 'unique'
      ? []
      : [
          t('explore.perses.traceTable.representative'),
          t('explore.perses.traceTable.' + row.rootState, { count: row.rootSpanCount })
        ];
  const services = Object.entries(row.serviceStats).map(([name, stat]) => name + ' (' + stat.spanCount + ')');
  if (row.unattributedServiceStats)
    services.push(t('explore.perses.traceTable.unattributed', { count: row.unattributedServiceStats.spanCount }));
  return [...structural, ...services].join(' · ');
}

export function TraceCounts({ row, t }: { row: TraceEvidence; t: TFunction }) {
  return (
    <div className={styles.name}>
      <span>{row.spanCount}</span>
      {row.errorSpanCount > 0 && (
        <span className={styles.error}>{t('explore.perses.traceTable.errors', { count: row.errorSpanCount })}</span>
      )}
    </div>
  );
}
