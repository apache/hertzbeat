/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, type OperationalStateKind } from '@/shared/operational-page/operational-page';

import styles from './route-state.module.css';

type RouteStatePlacement = 'content' | 'viewport';

export function RouteStateFrame({
  action,
  description,
  headingLevel,
  kind,
  placement = 'content',
  title
}: {
  action?: ReactNode | undefined;
  description?: ReactNode | undefined;
  headingLevel?: 1 | 2 | undefined;
  kind: OperationalStateKind;
  placement?: RouteStatePlacement | undefined;
  title: ReactNode;
}) {
  const stateTitle = headingLevel ? (
    <span role="heading" aria-level={headingLevel}>
      {title}
    </span>
  ) : (
    title
  );

  return (
    <div className={styles.frame} data-placement={placement} data-route-state-frame="">
      <OperationalStatePanel kind={kind} title={stateTitle} description={description} action={action} />
    </div>
  );
}

export function RouteLoadingState({ placement = 'content' }: { placement?: RouteStatePlacement | undefined }) {
  const { t } = useTranslation();
  return <RouteStateFrame kind="loading" placement={placement} title={t('common.loading')} />;
}
