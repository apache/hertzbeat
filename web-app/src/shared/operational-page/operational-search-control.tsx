/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Input, Space } from 'antd';
import type { ReactNode } from 'react';

import styles from './operational-page.module.css';

export type OperationalSearchControlProps = {
  ariaLabel: string;
  disabled?: boolean | undefined;
  placeholder: string;
  submitLabel: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => unknown;
};

export function OperationalSearchControl({
  ariaLabel,
  disabled = false,
  placeholder,
  submitLabel,
  value,
  onChange,
  onSubmit
}: OperationalSearchControlProps) {
  return (
    <Space.Compact className={styles.searchControl}>
      <Input
        allowClear
        aria-label={ariaLabel}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        onPressEnter={() => void onSubmit()}
      />
      <Button type="primary" disabled={disabled} onClick={() => void onSubmit()}>
        {submitLabel}
      </Button>
    </Space.Compact>
  );
}
