/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatOperationDuration, type OperationGroup } from '../model/trace-operation-statistics';
import {
  OperationLiteral as Literal,
  LocalPagination,
  TRACE_OPERATION_PAGE_SIZE as PAGE_SIZE
} from './trace-operation-statistics-primitives';
import styles from './trace-operation-statistics.module.css';
const COPY = 'exploreInvestigation.trace.operationStatistics.';
export function GroupDrilldown({ group, onClose }: { group: OperationGroup; onClose: () => void }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(group.count / PAGE_SIZE) - 1));
  return (
    <section className={styles.drilldown} aria-label={t(COPY + 'loadedSpans')}>
      <div className={styles.controls}>
        <h3>
          {t(COPY + 'loadedSpans')}: <Literal value={group.serviceName} /> / <Literal value={group.spanName} />
        </h3>
        <Button onClick={onClose}>{t(COPY + 'close')}</Button>
      </div>
      <p>{t(COPY + 'localOnly')}</p>
      <ul>
        {group.spans.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(span => (
          <li key={span.spanId}>
            <code>{span.spanId}</code> <span>{formatOperationDuration(span.end - span.start)}</span>
          </li>
        ))}
      </ul>
      <LocalPagination page={currentPage} total={group.count} onPage={setPage} label={t(COPY + 'loadedSpans')} />
    </section>
  );
}
