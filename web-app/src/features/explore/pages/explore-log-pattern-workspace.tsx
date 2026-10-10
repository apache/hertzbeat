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
