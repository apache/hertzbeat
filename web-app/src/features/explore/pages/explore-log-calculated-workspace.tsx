/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { ExactTimeWindow } from '@/shared/query-context';
import { useLogPatternSample } from '../controller/use-log-pattern-sample';
import { LogTransactionRows } from '../components/explore-log-transaction-rows';
import styles from '../components/explore-log-transactions.module.css';
import { calculateLogField, parseLogCalculated } from '../model/explore-log-calculated';
import type { LogExploreQuery } from '../model/explore-query';

export function ExploreLogCalculatedWorkspace({
  query,
  window,
  revision,
  t
}: {
  query: LogExploreQuery;
  window: ExactTimeWindow;
  revision: number;
  t: TFunction;
}) {
  const field = parseLogCalculated(query.logCalculated);
  const { path, load } = useLogPatternSample(query, window, revision, 'calculated', Boolean(field));
  if (!field)
    return (
      <section className={styles.status} role="alert">
        {t('explore.logCalculated.invalid')}
      </section>
    );
  if (load.isPending || load.isFetching)
    return (
      <section className={styles.status} role="status">
        {t('explore.logCalculated.loading')}
      </section>
    );
  if (load.isError)
    return (
      <section className={styles.status} role="alert">
        <p>{t('explore.logCalculated.error')}</p>
        <Button onClick={() => void load.refetch()}>{t('common.retry')}</Button>
      </section>
    );
  const rows = load.data.content;
  const values = rows.map(row => calculateLogField(row, field));
  const missing = values.filter(value => value === null).length;
  return (
    <section className={styles.result} key={`${path}:${revision}:${load.dataUpdatedAt}`}>
      <header>
        <h2>{t('explore.logCalculated.title')}</h2>
        <span>{t('explore.logCalculated.summary', { sampled: rows.length, total: load.data.totalElements })}</span>
      </header>
      <p>{t('explore.logCalculated.method')}</p>
      {load.data.totalElements > rows.length && (
        <p role="status">
          {t('explore.logCalculated.truncated', { sampled: rows.length, total: load.data.totalElements })}
        </p>
      )}
      {missing > 0 && <p>{t('explore.logCalculated.missing', { count: missing })}</p>}
      {rows.length ? (
        <LogTransactionRows rows={rows} timeZone={query.timeZone} t={t} derived={{ name: field.name, values }} />
      ) : (
        <p role="status">{t('explore.logCalculated.empty')}</p>
      )}
    </section>
  );
}
