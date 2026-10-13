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
import type { HertzBeatTraceColumn, HertzBeatTraceDisplay } from './perses-trace-display';
import type { TraceSpanPage, TraceSpanRow } from '../datasource/hertzbeat-trace-analytics-schema';
import { spanColumnLabel } from './trace-span-column-label';
import styles from './trace-analytics-table.module.css';
function cell(row: TraceSpanRow, key: HertzBeatTraceColumn, timeZone: string | undefined): string {
  if (key === 'service') return row.serviceName ?? '—';
  if (key === 'spanCount') return '1';
  if (key === 'errorCount') return row.status === 'ERROR' ? '1' : '0';
  if (key === 'duration') return row.durationNanos === null ? '—' : duration(row.durationNanos);
  if (key === 'startTime')
    return new Date(Number(BigInt(row.startTimeUnixNano) / 1_000_000n)).toLocaleString(undefined, {
      timeZone,
      hour12: false,
      timeZoneName: 'short'
    });
  return key === 'traceId' ? row.traceId : (row.operationName ?? '—');
}

function duration(value: string) {
  const nanos = Number(value);
  const units = [
    [1e9, 's'],
    [1e6, 'ms'],
    [1e3, 'μs'],
    [1, 'ns']
  ] as const;
  const [divisor, unit] = units.find(([threshold]) => nanos >= threshold) ?? units[3];
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(nanos / divisor)} ${unit}`;
}
function exactTime(value: string) {
  const nanos = BigInt(value),
    fraction = (nanos % 1_000_000_000n).toString().padStart(9, '0');
  return new Date(Number(nanos / 1_000_000n)).toISOString().replace(/\.\d{3}Z$/u, `.${fraction}Z`);
}

export function TraceSpanRows({
  data,
  display,
  onOpen,
  timeZone,
  enabled
}: {
  display: HertzBeatTraceDisplay;
  onOpen?: ((row: TraceSpanRow) => void) | undefined;
  timeZone?: string | undefined;
  data: NonNullable<TraceSpanPage['data']>;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.scroll}>
      <table
        className={styles.table}
        data-density={display.density}
        aria-label={t('exploreTrace.analytics.matched_spans')}
      >
        <thead>
          <tr>
            {display.columns.map(key => (
              <th key={key}>{t(spanColumnLabel(key))}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.content.map(row => (
            <tr key={`${row.traceId}/${row.spanId}`}>
              {display.columns.map(key => (
                <td key={key} title={cell(row, key, timeZone)}>
                  {key === 'traceName' && onOpen ? (
                    <button disabled={!enabled} onClick={() => onOpen(row)}>
                      {row.operationName ?? '—'}
                    </button>
                  ) : key === 'traceId' ? (
                    <code>{row.traceId}</code>
                  ) : key === 'duration' ? (
                    <span title={row.durationNanos === null ? undefined : `${row.durationNanos} ns`}>
                      {cell(row, key, timeZone)}
                    </span>
                  ) : key === 'startTime' ? (
                    <time dateTime={exactTime(row.startTimeUnixNano)}>{cell(row, key, timeZone)}</time>
                  ) : (
                    cell(row, key, timeZone)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
