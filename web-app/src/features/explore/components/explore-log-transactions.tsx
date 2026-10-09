/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { RefObject } from 'react';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { LogTransactionsView } from '../model/explore-log-transactions-view';
import { ExploreInvalidLogFilter } from './explore-invalid-log-filter';
import { LogTransactionStatus } from './explore-log-transaction-status';
import styles from './explore-log-transactions.module.css';
type Props = {
  load: LogTransactionsView;
  t: TFunction;
  selected: string | undefined;
  onSelect: (identity: string) => void;
  buttons: RefObject<Map<string, HTMLElement>>;
};
export function ExploreLogTransactions({ load, t, selected, onSelect, buttons }: Props) {
  const data = load.data;
  if (load.state === 'invalid_filter')
    return (
      <ExploreInvalidLogFilter
        invalidFilterReason={load.invalidFilterReason}
        syntaxDiagnostic={load.syntaxDiagnostic}
      />
    );
  if (load.state !== 'ready' || !data) return <LogTransactionStatus state={load.state} retry={load.retry} t={t} />;
  return (
    <section className={styles.result}>
      <p>{t('explore.logTransactions.explanation')}</p>
      <TransactionSummary data={data} t={t} />
      <p>{t('explore.logTransactions.observedHint')}</p>
      <TransactionTable data={data} selected={selected} buttons={buttons} onSelect={onSelect} t={t} />
      <p>
        {t('explore.logTransactions.excluded', {
          other: data.otherExcludedSeedLogCount,
          oversized: data.oversizedSeedLogCount
        })}
      </p>
      {data.truncated && (
        <p role="status">
          {t('explore.logTransactions.truncated', { shown: data.items.length, total: data.transactionCount })}
        </p>
      )}
    </section>
  );
}

type Data = NonNullable<Props['load']['data']>;
function TransactionTable({
  data,
  selected,
  buttons,
  onSelect,
  t
}: {
  data: Data;
  selected: string | undefined;
  buttons: RefObject<Map<string, HTMLElement>>;
  onSelect: (identity: string) => void;
  t: TFunction;
}) {
  return (
    <>
      {' '}
      {data.items.length ? (
        <div className={styles.scroll}>
          <table>
            <thead>
              <tr>
                {['identity', 'seedCount', 'relatedCount', 'duration', 'maxSeverity'].map(key => (
                  <th key={key}>{t('explore.logTransactions.' + key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map(row => (
                <tr key={row.identity} aria-selected={selected === row.identity}>
                  <td>
                    <Button
                      type="link"
                      title={JSON.stringify(row.identity)}
                      ref={node => {
                        if (node) buttons.current?.set(row.identity, node);
                        else buttons.current?.delete(row.identity);
                      }}
                      onClick={() => onSelect(row.identity)}
                    >
                      {JSON.stringify(row.identity)}
                    </Button>
                  </td>
                  <td>{row.seedCount.toLocaleString()}</td>
                  <td>{row.relatedCount.toLocaleString()}</td>
                  <td>
                    {(Number(row.durationNanos) / 1_000_000).toLocaleString(undefined, { maximumSignificantDigits: 6 })}{' '}
                    ms
                  </td>
                  <td>{row.maximumSeverity ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p role="status">{t('explore.logTransactions.' + (data.seedLogCount ? 'noIds' : 'noMatches'))}</p>
      )}
    </>
  );
}
function TransactionSummary({ data, t }: { data: Data; t: TFunction }) {
  return (
    <>
      {' '}
      <header>
        <h2>{t('explore.logTransactions.title')}</h2>
        {(['idTotal', 'seedTotal', 'usableTotal', 'relatedTotal'] as const).map((key, i) => (
          <span key={key}>
            {t('explore.logTransactions.' + key, {
              count: [data.transactionCount, data.seedLogCount, data.usableSeedLogCount, data.relatedLogCount][i]
            })}
          </span>
        ))}
      </header>
    </>
  );
}
