/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ComponentProps } from 'react';
import styles from './explore-query-row.module.css';
export function ExploreQueryRow({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={[styles.row, className].filter(Boolean).join(' ')} data-signal-query-row />;
}
