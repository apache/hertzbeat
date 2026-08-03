/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ReactNode } from 'react';

import styles from './monitor-editor-form-view.module.css';

/** Keeps required evidence consistent across core and definition-driven fields. */
export function MonitorEditorFieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className={styles.fieldLabel}>
      {required ? (
        <span className={styles.requiredMarker} aria-hidden="true">
          *
        </span>
      ) : null}
      {children}
    </span>
  );
}
