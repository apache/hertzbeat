/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
