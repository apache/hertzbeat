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

import { Typography } from 'antd';
import { useId } from 'react';
import type { AriaRole, PropsWithChildren, ReactNode } from 'react';

import styles from './operational-page.module.css';

export type OperationalPageMode = 'data' | 'workspace' | 'form';

export function OperationalPage({
  children,
  mode = 'data',
  inset
}: PropsWithChildren<{ mode?: OperationalPageMode | undefined; inset?: 'compact' | undefined }>) {
  return (
    <div className={styles.page} data-hb-operational-page="" data-mode={mode} data-inset={inset}>
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
      <div className={styles.commandPrimary} data-hb-operational-command-primary="">
        {primary}
      </div>
      {secondary == null ? null : (
        <div className={styles.commandSecondary} data-hb-operational-command-secondary="">
          {secondary}
        </div>
      )}
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

export function OperationalFormActions({ children }: PropsWithChildren) {
  return (
    <footer className={styles.formActions} data-hb-operational-form-actions="">
      {children}
    </footer>
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

export type OperationalStateKind =
  'loading' | 'empty' | 'no-match' | 'unsupported' | 'unavailable' | 'permission' | 'error';
export type OperationalStatePresentation = 'accent' | 'quiet';

export function OperationalStatePanel({
  kind,
  title,
  description,
  action,
  presentation = 'accent'
}: {
  kind: OperationalStateKind;
  title: ReactNode;
  description?: ReactNode | undefined;
  action?: ReactNode | undefined;
  presentation?: OperationalStatePresentation | undefined;
}) {
  const titleId = useId();
  return (
    <section
      className={styles.statePanel}
      role={operationalStateRole(kind)}
      aria-labelledby={titleId}
      data-state={kind}
      data-presentation={presentation}
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

export function OperationalTableEmptyState({
  title,
  description
}: {
  title: ReactNode;
  description?: ReactNode | undefined;
}) {
  return (
    <div data-hb-operational-table-empty="">
      <OperationalStatePanel kind="empty" presentation="quiet" title={title} description={description} />
    </div>
  );
}

function operationalStateRole(kind: OperationalStateKind) {
  return kind === 'error' || kind === 'unavailable' ? 'alert' : 'status';
}
