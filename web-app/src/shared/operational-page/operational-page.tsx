/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Typography } from 'antd';
import { useId } from 'react';
import type { AriaRole, PropsWithChildren, ReactNode } from 'react';

import styles from './operational-page.module.css';

export type OperationalPageMode = 'data' | 'workspace' | 'form';

export function OperationalPage({
  children,
  mode = 'data'
}: PropsWithChildren<{ mode?: OperationalPageMode | undefined }>) {
  return (
    <div className={styles.page} data-hb-operational-page="" data-mode={mode}>
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
        <Typography.Title {...(titleId === undefined ? {} : { id: titleId })} level={2}>
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

export function OperationalCommandBar({
  primary,
  secondary,
  role,
  ariaLabel
}: {
  primary: ReactNode;
  secondary?: ReactNode | undefined;
  role?: AriaRole | undefined;
  ariaLabel?: string | undefined;
}) {
  return (
    <div
      className={styles.commandBar}
      data-hb-operational-command-bar=""
      {...(role === undefined ? {} : { role })}
      {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
    >
      <div className={styles.commandPrimary}>{primary}</div>
      {secondary == null ? null : <div className={styles.commandSecondary}>{secondary}</div>}
    </div>
  );
}

export function OperationalResultRegion({ children }: PropsWithChildren) {
  return (
    <div className={styles.resultRegion} data-hb-operational-result-region="">
      {children}
    </div>
  );
}

export function OperationalSection({
  title,
  description,
  actions,
  children
}: PropsWithChildren<{
  title: ReactNode;
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}>) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionCopy}>
          <Typography.Title id={titleId} level={4}>
            {title}
          </Typography.Title>
          {description == null ? null : <Typography.Text type="secondary">{description}</Typography.Text>}
        </div>
        {actions == null ? null : <div className={styles.sectionActions}>{actions}</div>}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export type OperationalStateKind = 'loading' | 'empty' | 'no-match' | 'unavailable' | 'permission' | 'error';

export function OperationalStatePanel({
  kind,
  title,
  description,
  action
}: {
  kind: OperationalStateKind;
  title: ReactNode;
  description?: ReactNode | undefined;
  action?: ReactNode | undefined;
}) {
  const titleId = useId();
  return (
    <section
      className={styles.statePanel}
      role={operationalStateRole(kind)}
      aria-labelledby={titleId}
      data-state={kind}
    >
      <div className={styles.stateCopy}>
        <Typography.Text id={titleId} strong>
          {title}
        </Typography.Text>
        {description == null ? null : <Typography.Text type="secondary">{description}</Typography.Text>}
      </div>
      {action == null ? null : <div className={styles.stateAction}>{action}</div>}
    </section>
  );
}

function operationalStateRole(kind: OperationalStateKind) {
  return kind === 'error' || kind === 'unavailable' ? 'alert' : 'status';
}
