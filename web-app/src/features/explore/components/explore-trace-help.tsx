/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './explore-trace-layout.module.css';
export function ExploreTraceHelp({
  children,
  labelKey = 'exploreTrace.layout.filterHelp'
}: {
  children: ReactNode;
  labelKey?: string;
}) {
  const { t } = useTranslation();
  return (
    <details className={styles.help}>
      <summary>{t(labelKey)}</summary>
      {children}
    </details>
  );
}
