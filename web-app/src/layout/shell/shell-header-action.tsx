/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Tooltip } from 'antd';
import type { ReactNode } from 'react';

import styles from './hertzbeat-shell.module.css';

type ShellHeaderActionProps = {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

/**
 * Keeps header icon actions consistent and accessible without coupling their
 * browser or navigation behavior to the presentation component.
 */
export function ShellHeaderAction({ label, icon, disabled = false, onClick }: ShellHeaderActionProps) {
  return (
    <Tooltip title={label}>
      <Button
        className={styles.headerAction ?? ''}
        type="text"
        aria-label={label}
        icon={icon}
        disabled={disabled}
        onClick={onClick}
      />
    </Tooltip>
  );
}
