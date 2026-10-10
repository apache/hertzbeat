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

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import styles from '../shared/alert-silence-editor.module.css';

export function AlertSilenceFieldRow({
  children,
  error,
  invalid = false,
  label,
  required = false,
  wideControl = false
}: {
  children: ReactNode;
  error?: string;
  invalid?: boolean;
  label: string;
  required?: boolean;
  wideControl?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`${styles.fieldRow} ${wideControl ? (styles.wideControl ?? '') : ''}`}
      data-control-width={wideControl ? 'wide' : undefined}
      data-invalid={invalid || undefined}
    >
      <div className={`${styles.fieldLabel} ${alignmentStyles.label}`}>
        {required && (
          <span className={styles.requiredMark} aria-hidden="true">
            *
          </span>
        )}
        <span>{label}</span>
      </div>
      <div className={`${styles.fieldControl} ${alignmentStyles.control}`}>
        {children}
        {invalid && <span className={styles.fieldError}>{error ?? t('alertSilences.required')}</span>}
      </div>
      {!wideControl && <span aria-hidden="true" />}
    </div>
  );
}
