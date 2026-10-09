/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ReactNode } from 'react';
import { Button } from 'antd';

import { OperationalStatePanel } from '@/shared/operational-page';

import styles from './signal-result-frame.module.css';

type MetaItem = { label: string; value: ReactNode; accessibleValue?: string | undefined };

export function SignalResultFrame({
  title,
  count,
  leadingAction,
  unit,
  meta = [],
  metaPresentation = 'default',
  actions,
  children
}: {
  title: string;
  count: number;
  leadingAction?: ReactNode | undefined;
  unit?: string | undefined;
  meta?: MetaItem[] | undefined;
  metaPresentation?: 'default' | 'compact' | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section className={styles.frame} data-meta-presentation={metaPresentation}>
      <header className={styles.header}>
        <div className={styles.identity}>
          {leadingAction}
          <h3>{title}</h3>
          <span>
            {count.toLocaleString()}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
        <div className={styles.headerTools}>
          {meta.length > 0 && (
            <dl className={styles.meta}>
              {meta.map(item => (
                <div
                  key={item.label}
                  {...(metaPresentation === 'compact'
                    ? { 'aria-label': `${item.label}: ${item.accessibleValue ?? ''}`, title: item.label }
                    : {})}
                >
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {actions}
        </div>
      </header>
      {children}
    </section>
  );
}

export function SignalEmptyState({
  title,
  hint,
  reviewQueryLabel
}: {
  title: string;
  hint: string;
  reviewQueryLabel?: string | undefined;
}) {
  return (
    <OperationalStatePanel
      kind="empty"
      presentation="quiet"
      title={title}
      description={hint}
      action={
        reviewQueryLabel ? (
          <Button
            onClick={event => {
              event.currentTarget.closest('[data-explore-query-layout]')?.querySelector('form')?.focus();
            }}
          >
            {reviewQueryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
