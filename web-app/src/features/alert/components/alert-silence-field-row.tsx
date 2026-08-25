/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
