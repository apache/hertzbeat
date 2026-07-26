/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Typography } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';

import styles from './operational-page.module.css';

export function OperationalPage({ children }: PropsWithChildren) {
  return (
    <div className={styles.page} data-hb-operational-page="">
      {children}
    </div>
  );
}

export function OperationalPageHeader({
  title,
  titleId,
  description,
  actions
}: {
  title: ReactNode;
  titleId?: string | undefined;
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  const hasActions = actions != null;
  return (
    <header
      className={hasActions ? `${styles.header} ${styles.withActions}` : styles.header}
      data-hb-operational-page-header=""
    >
      <div className={styles.copy}>
        <Typography.Title id={titleId} level={2}>
          {title}
        </Typography.Title>
        {description != null ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
      </div>
      {hasActions ? (
        <div className={styles.actions} data-hb-operational-page-actions="">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
