/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { Button } from 'antd';
import type { ExactTimeWindow } from '@/shared/query-context';
import { useLogPatternSample } from '../controller/use-log-pattern-sample';
import { groupLogPatterns } from '../model/explore-log-patterns';
import type { LogExploreQuery } from '../model/explore-query';
import { ExploreLogPatterns } from '../components/explore-log-patterns';
import styles from '../components/explore-log-transactions.module.css';

export function ExploreLogPatternWorkspace({
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
  const { path, load } = useLogPatternSample(query, window, revision, 'patterns');
  if (load.isPending || load.isFetching) return <PatternStatus message={t('explore.logPatterns.loading')} />;
  if (load.isError)
    return <PatternStatus message={t('explore.logPatterns.error')} retry={() => void load.refetch()} t={t} />;
  return (
    <ExploreLogPatterns
      key={`${path}:${revision}:${load.dataUpdatedAt}`}
      {...groupLogPatterns(load.data.content, load.data.totalElements)}
      timeZone={query.timeZone}
      t={t}
    />
  );
}

function PatternStatus({ message, retry, t }: { message: string; retry?: () => void; t?: TFunction }) {
  return (
    <section className={styles.status} role="status">
      <p>{message}</p>
      {retry && t && <Button onClick={retry}>{t('common.retry')}</Button>}
    </section>
  );
}
