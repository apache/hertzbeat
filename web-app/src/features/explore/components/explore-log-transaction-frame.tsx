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

import { Drawer, Grid } from 'antd';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './explore-log-transactions.module.css';
import frameStyles from './explore-log-transaction-frame.module.css';
export function TransactionRailFrame({
  label,
  onClose,
  children
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const narrow = Grid.useBreakpoint().md === false;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!narrow) ref.current?.focus();
  }, [narrow]);
  if (narrow)
    return (
      <Drawer
        open
        title={
          <span className={frameStyles.identity} title={label}>
            {label}
          </span>
        }
        width="100%"
        onClose={onClose}
        styles={{ body: { padding: 'var(--hb-space-3)' } }}
      >
        <div className={frameStyles.detail}>{children}</div>
      </Drawer>
    );
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      className={styles.rail}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {children}
    </aside>
  );
}
