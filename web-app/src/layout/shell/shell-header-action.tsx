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
