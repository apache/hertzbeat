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
