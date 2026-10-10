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
