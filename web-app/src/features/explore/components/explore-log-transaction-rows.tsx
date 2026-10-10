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

import { useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import { normalizeInvestigationTimeZone } from '@/shared/query-context';
import { logSeverityLabel } from '@/shared/log-severity';
import type { LogRow } from '../model/explore-signal-contract';
import { logTimestampMs } from '../model/explore-signal-model';
import { ExploreLogInspector } from './explore-log-inspector';
import styles from './explore-log-transactions.module.css';
export function LogTransactionRows({
  rows,
  timeZone,
  t,
  derived
}: {
  rows: LogRow[];
  timeZone: string | undefined;
  t: TFunction;
  derived?: { name: string; values: (number | string | null)[] };
}) {
  const region = useRef<HTMLDivElement>(null);
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [index, setIndex] = useState<number | undefined>();
  const buttons = useRef(new Map<number, HTMLElement>());
  const row = index === undefined ? undefined : rows[index];
  const close = () => {
    const selected = index;
    setIndex(undefined);
    requestAnimationFrame(() => {
      if (selected !== undefined) buttons.current.get(selected)?.focus();
    });
  };
  const select = (index: number) => {
    setPortalHost(region.current?.closest('[role="dialog"]') ?? document.body);
    setIndex(index);
  };
  return (
    <>
      <div ref={region} className={styles.scroll}>
        <table>
          <thead>
            <tr>
              {['time', 'severity', 'message'].map(key => (
                <th key={key}>{t('explore.' + key)}</th>
              ))}
              {derived && <th>{derived.name}</th>}
            </tr>
          </thead>
          <tbody>
            <TransactionRowCells
              rows={rows}
              timeZone={timeZone}
              buttons={buttons}
              select={select}
              {...(derived ? { derived } : {})}
            />
          </tbody>
        </table>
      </div>
      {row &&
        portalHost &&
        index !== undefined &&
        createPortal(
          <ExploreLogInspector
            id="transaction-log-inspector"
            row={row}
            selectedIndex={index}
            rowCount={rows.length}
            evidenceCurrent
            onSelectIndex={setIndex}
            onClose={close}
          />,
          portalHost
        )}
    </>
  );
}
function rowTime(row: LogRow, requestedZone: string | undefined) {
  const timeZone = normalizeInvestigationTimeZone(requestedZone);
  const timestamp = logTimestampMs(row);
  return timestamp == null
    ? '—'
    : new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        ...(timeZone ? { timeZone } : {})
      });
}

function TransactionRowCells({
  rows,
  timeZone,
  buttons,
  select,
  derived
}: {
  rows: LogRow[];
  timeZone: string | undefined;
  buttons: RefObject<Map<number, HTMLElement>>;
  select: (index: number) => void;
  derived?: { name: string; values: (number | string | null)[] };
}) {
  return (
    <>
      {rows.map((item, i) => (
        <tr key={item.logRecordUid ?? i}>
          <td>{rowTime(item, timeZone)}</td>
          <td>{logSeverityLabel(item) ?? '—'}</td>
          <td>
            <Button
              type="link"
              ref={node => {
                if (node) buttons.current?.set(i, node);
                else buttons.current?.delete(i);
              }}
              onClick={() => select(i)}
            >
              {typeof item.body === 'string' ? item.body || '""' : JSON.stringify(item.body)}
            </Button>
          </td>
          {derived && <td>{derived.values[i] ?? '—'}</td>}
        </tr>
      ))}
    </>
  );
}
