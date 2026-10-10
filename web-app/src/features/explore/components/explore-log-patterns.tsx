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

import { useRef, useState } from 'react';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { LogPattern } from '../model/explore-log-patterns';
import { TransactionRailFrame } from './explore-log-transaction-frame';
import { LogTransactionRows } from './explore-log-transaction-rows';
import styles from './explore-log-transactions.module.css';

export function ExploreLogPatterns({
  groups,
  sampled,
  total,
  excluded,
  timeZone,
  t
}: {
  groups: LogPattern[];
  sampled: number;
  total: number;
  excluded: number;
  timeZone: string | undefined;
  t: TFunction;
}) {
  const [selected, setSelected] = useState<string>();
  const buttons = useRef(new Map<string, HTMLElement>());
  const group = groups.find(item => item.key === selected);
  const close = () => {
    const key = selected;
    setSelected(undefined);
    requestAnimationFrame(() => {
      if (key) buttons.current.get(key)?.focus();
    });
  };
  return (
    <section className={styles.result}>
      <header>
        <h2>{t('explore.logPatterns.title')}</h2>
        <span>{t('explore.logPatterns.summary', { count: groups.length, sampled, total })}</span>
      </header>
      <p>{t('explore.logPatterns.method')}</p>
      {total > sampled && <p role="status">{t('explore.logPatterns.truncated', { sampled, total })}</p>}
      {excluded > 0 && <p>{t('explore.logPatterns.excluded', { count: excluded })}</p>}
      {groups.length ? (
        <div className={styles.scroll}>
          <table>
            <thead>
              <tr>
                {['pattern', 'service', 'severity', 'count'].map(key => (
                  <th key={key}>{t('explore.logPatterns.' + key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(item => (
                <tr key={item.key} aria-selected={selected === item.key}>
                  <td>
                    <Button
                      type="link"
                      ref={node => {
                        if (node) buttons.current.set(item.key, node);
                        else buttons.current.delete(item.key);
                      }}
                      onClick={() => setSelected(item.key)}
                    >
                      {item.template}
                    </Button>
                  </td>
                  <td>{item.service || '—'}</td>
                  <td>{item.severity || '—'}</td>
                  <td>{item.rows.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p role="status">{t('explore.logPatterns.empty')}</p>
      )}
      {group && <PatternInspection key={group.key} group={group} timeZone={timeZone} onClose={close} t={t} />}
    </section>
  );
}

function PatternInspection({
  group,
  timeZone,
  onClose,
  t
}: {
  group: LogPattern;
  timeZone: string | undefined;
  onClose: () => void;
  t: TFunction;
}) {
  const [page, setPage] = useState(0);
  const size = 100;
  const last = Math.ceil(group.rows.length / size) - 1;
  return (
    <TransactionRailFrame label={t('explore.logPatterns.inspect')} onClose={onClose}>
      <header>
        <h2>{group.template}</h2>
        <Button onClick={onClose}>{t('explore.logPatterns.back')}</Button>
      </header>
      <p>{t('explore.logPatterns.memberHint', { count: group.rows.length })}</p>
      <LogTransactionRows rows={group.rows.slice(page * size, (page + 1) * size)} timeZone={timeZone} t={t} />
      {last > 0 && (
        <footer>
          <Button disabled={page === 0} onClick={() => setPage(value => value - 1)}>
            {t('explore.logTransactions.previous')}
          </Button>
          <span>{t('explore.logPatterns.page', { page: page + 1, total: last + 1 })}</span>
          <Button disabled={page === last} onClick={() => setPage(value => value + 1)}>
            {t('explore.logTransactions.next')}
          </Button>
        </footer>
      )}
    </TransactionRailFrame>
  );
}
