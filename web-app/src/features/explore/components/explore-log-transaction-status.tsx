/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import styles from './explore-log-transactions.module.css';
export function LogTransactionStatus({ state, retry, t }: { state: string; retry: () => void; t: TFunction }) {
  const key =
    state === 'invalid'
      ? 'explore.logTransactions.invalid'
      : state === 'history_only'
        ? 'explore.logTransactions.historyOnly'
        : 'explore.logAnalysis.' + (state === 'idle' ? 'loading' : state);
  return (
    <section className={styles.status} role="status">
      <p>{t(key)}</p>
      {['error', 'unavailable'].includes(state) && <Button onClick={retry}>{t('common.retry')}</Button>}
    </section>
  );
}
