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

import { logFilterFailureDescription } from '../model/explore-log-filter-failure';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogTransactionDetailView } from '../model/explore-log-transactions-view';
import { LogTransactionStatus } from './explore-log-transaction-status';
import { LogTransactionRows } from './explore-log-transaction-rows';
export function TransactionDetailResult({
  load,
  detail,
  onPage,
  query,
  t
}: {
  load: LogTransactionDetailView;
  detail: { pageIndex: number };
  onPage: (page: number) => void;
  query: LogExploreQuery;
  t: TFunction;
}) {
  return (
    <>
      {' '}
      {load.state === 'invalid_filter' ? (
        <p role="alert">{logFilterFailureDescription(t, load.invalidFilterReason, load.syntaxDiagnostic)}</p>
      ) : load.state !== 'ready' || !load.data ? (
        <LogTransactionStatus state={load.state} retry={load.retry} t={t} />
      ) : !load.data.qualified ? (
        <p role="status">{t('explore.logTransactions.unqualified')}</p>
      ) : (
        <>
          <LogTransactionRows rows={load.data.rows} timeZone={query.timeZone} t={t} />
          {load.data.rows.length === 0 && <p role="status">{t('explore.logTransactions.localEmpty')}</p>}
          <footer>
            <Button disabled={detail.pageIndex === 0} onClick={() => onPage(detail.pageIndex - 1)}>
              {t('explore.logTransactions.previous')}
            </Button>
            <span>{t('explore.logTransactions.page', { page: detail.pageIndex + 1, total: load.data.total })}</span>
            <Button
              disabled={(detail.pageIndex + 1) * 20 >= (load.data.total ?? 0)}
              onClick={() => onPage(detail.pageIndex + 1)}
            >
              {t('explore.logTransactions.next')}
            </Button>
          </footer>
        </>
      )}
    </>
  );
}
