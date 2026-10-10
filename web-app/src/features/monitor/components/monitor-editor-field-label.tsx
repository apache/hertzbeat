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
