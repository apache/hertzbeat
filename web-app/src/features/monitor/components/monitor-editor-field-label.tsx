/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';

import styles from './monitor-editor-form-view.module.css';

/** Keeps required evidence consistent across core and definition-driven fields. */
export function MonitorEditorFieldLabel({
  children,
  required = false,
  help
}: {
  children: ReactNode;
  required?: boolean;
  help?: string | undefined;
}) {
  return (
    <span className={styles.fieldLabel} {...(help ? { title: help } : {})}>
      {required ? (
        <span className={styles.requiredMarker} aria-hidden="true">
          *
        </span>
      ) : null}
      {children}
      {help ? <MonitorEditorFieldHelp help={help} /> : null}
    </span>
  );
}

export function MonitorEditorFieldHelp({ help }: { help: string }) {
  return (
    <Tooltip title={help}>
      <QuestionCircleOutlined
        aria-hidden="true"
        className={styles.fieldHelp}
        data-monitor-field-help={help}
        onClick={event => event.preventDefault()}
      />
    </Tooltip>
  );
}
