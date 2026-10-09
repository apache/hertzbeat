/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import type { OperationSort, traceOperationStatistics } from '../model/trace-operation-statistics';
import styles from './trace-operation-statistics.module.css';
export const TRACE_OPERATION_PAGE_SIZE = 25;
const PAGE_SIZE = TRACE_OPERATION_PAGE_SIZE;
const COPY = 'exploreInvestigation.trace.operationStatistics.';
export function OperationLiteral({ value }: { value: string | null }) {
  const { t } = useTranslation();
  return (
    <span className={styles.literal} title={JSON.stringify(value)}>
      {value === null
        ? t(COPY + 'missing')
        : value === ''
          ? t(COPY + 'empty')
          : value.trim() === ''
            ? JSON.stringify(value)
            : value}
    </span>
  );
}

export function LocalPagination({
  page,
  total,
  onPage,
  label
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
  label: string;
}) {
  const { t } = useTranslation();
  if (total <= PAGE_SIZE) return null;
  return (
    <nav className={styles.pagination} aria-label={label}>
      <Button disabled={page === 0} onClick={() => onPage(page - 1)}>
        {t(COPY + 'previous')}
      </Button>
      <span>{t(COPY + 'page', { page: page + 1, total: Math.ceil(total / PAGE_SIZE) })}</span>
      <Button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => onPage(page + 1)}>
        {t(COPY + 'next')}
      </Button>
    </nav>
  );
}

export function StatisticsControls({
  filter,
  sort,
  onFilter,
  onSort
}: {
  filter: string;
  sort: OperationSort;
  onFilter: (value: string) => void;
  onSort: (value: OperationSort) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.controls}>
      <Input
        aria-label={t(COPY + 'filter')}
        placeholder={t(COPY + 'filter')}
        value={filter}
        onChange={event => {
          onFilter(event.target.value);
        }}
        allowClear
      />
      <label>
        {t(COPY + 'sort')}{' '}
        <select
          value={sort}
          onChange={event => {
            onSort(event.target.value as OperationSort);
          }}
        >
          {(['sum', 'average', 'self', 'count'] as const).map(value => (
            <option key={value} value={value}>
              {t(COPY + value)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function StatisticsSampleNotice({
  data,
  evidenceCurrent
}: {
  data: ReturnType<typeof traceOperationStatistics>;
  evidenceCurrent: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className={styles.sampleScope}>
        <span>{t(COPY + 'sample', { count: data.validCount, loaded: data.loadedCount })}</span>
        {data.partial && <span role="status">{t(COPY + (data.capped ? 'capped' : 'partial'))}</span>}
        <details className={styles.explanation}>
          <summary>{t(COPY + 'explanation')}</summary>
          <p>{t(COPY + 'selfExplanation')}</p>
        </details>
      </div>
      {data.skipped > 0 && (
        <p role="status">
          {t(COPY + 'skipped', { count: data.skipped, duplicates: data.duplicateSpans, cycles: data.cyclicSpans })}
        </p>
      )}
      {!evidenceCurrent && <p role="status">{t(COPY + 'stale')}</p>}
    </>
  );
}
