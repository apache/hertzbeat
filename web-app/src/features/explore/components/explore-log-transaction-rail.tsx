/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button, Input, Select } from 'antd';
import type { TFunction } from 'i18next';
import { normalizeInvestigationTimeZone, type ExactTimeWindow } from '@/shared/query-context';
import { TransactionRailFrame } from './explore-log-transaction-frame';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogTransactionState } from '../model/explore-log-transactions';
import type { LogTransactionsResult } from '../model/explore-log-transactions-result';
import type { LogTransactionDetailView } from '../model/explore-log-transactions-view';
import { TransactionDetailResult } from './explore-log-transaction-detail';
import styles from './explore-log-transactions.module.css';
export type LogTransactionRailProps = {
  load: LogTransactionDetailView;
  draft: string;
  detail: { pageIndex: number; sort: 'oldest' | 'newest' };
  setDraft: (draft: string) => void;
  apply: (search: string) => void;
  onSort: (sort: 'oldest' | 'newest') => void;
  onPage: (page: number) => void;
  query: LogExploreQuery;
  window: ExactTimeWindow;
  config: LogTransactionState;
  item: LogTransactionsResult['items'][number];
  onClose: () => void;
  t: TFunction;
};
export function ExploreLogTransactionRail({
  query,
  window,
  item,
  onClose,
  t,
  load,
  draft,
  detail,
  setDraft,
  apply,
  onSort,
  onPage
}: LogTransactionRailProps) {
  return (
    <TransactionRailFrame
      label={t('explore.logTransactions.relatedTitle', { identity: JSON.stringify(item.identity) })}
      onClose={onClose}
    >
      <header>
        <h2 title={JSON.stringify(item.identity)}>{JSON.stringify(item.identity)}</h2>
        <Button onClick={onClose}>{t('explore.logTransactions.back')}</Button>
      </header>
      <p>{[query.serviceName, query.environment, query.serviceNamespace].filter(Boolean).join(' · ')}</p>
      <p>{formatWindow(window, query.timeZone)}</p>
      <TransactionStats item={item} t={t} />
      <p>{t('explore.logTransactions.relatedHint')}</p>
      <p>{t('explore.logTransactions.observedHint')}</p>
      <TransactionSearch draft={draft} setDraft={setDraft} apply={apply} sort={detail.sort} onSort={onSort} t={t} />
      <TransactionDetailResult load={load} detail={detail} onPage={onPage} query={query} t={t} />
    </TransactionRailFrame>
  );
}
function formatWindow(window: ExactTimeWindow, requestedZone: string | undefined) {
  const timeZone = normalizeInvestigationTimeZone(requestedZone);
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'medium',
    ...(timeZone ? { timeZone } : {})
  };
  return (
    new Date(window.from).toLocaleString(undefined, options) +
    ' – ' +
    new Date(window.to).toLocaleString(undefined, options) +
    (timeZone ? ' · ' + timeZone : '')
  );
}

function TransactionSearch({
  draft,
  setDraft,
  apply,
  sort,
  onSort,
  t
}: {
  draft: string;
  setDraft: (value: string) => void;
  apply: (value: string) => void;
  sort: 'oldest' | 'newest';
  onSort: (value: 'oldest' | 'newest') => void;
  t: TFunction;
}) {
  return (
    <>
      {' '}
      <form
        className={styles.search}
        onSubmit={event => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <label>
          {t('explore.logTransactions.search')}
          <Input value={draft} onChange={event => setDraft(event.target.value)} />
        </label>
        <Button htmlType="submit">{t('explore.logTransactions.apply')}</Button>
        <Button
          onClick={() => {
            setDraft('');
            apply('');
          }}
        >
          {t('explore.logTransactions.reset')}
        </Button>
      </form>
      <Select
        aria-label={t('explore.logColumns.sort')}
        value={sort}
        options={['oldest', 'newest'].map(value => ({ value, label: t('explore.logColumns.' + value) }))}
        onChange={onSort}
      />
    </>
  );
}

function TransactionStats({ item, t }: { item: LogTransactionRailProps['item']; t: TFunction }) {
  return (
    <>
      {' '}
      <dl className={styles.stats}>
        {[
          ['seedCount', item.seedCount],
          ['relatedCount', item.relatedCount],
          [
            'duration',
            (Number(item.durationNanos) / 1_000_000).toLocaleString(undefined, { maximumSignificantDigits: 6 }) + ' ms'
          ]
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{t('explore.logTransactions.' + key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
