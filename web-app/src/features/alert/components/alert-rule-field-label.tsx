/* Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

import alignmentStyles from '@/shared/horizontal-field/horizontal-field-alignment.module.css';

import styles from '../shared/alert-rule-editor.module.css';

type AlertRuleFieldLabelProps = {
  className?: string | undefined;
  label: string;
  required?: boolean | undefined;
  help?: string | undefined;
  colon?: boolean | undefined;
};

/** Mirrors the source horizontal-form label, including help and colon semantics. */
export function AlertRuleFieldLabel({
  className,
  label,
  required = false,
  help,
  colon = true
}: AlertRuleFieldLabelProps) {
  return (
    <span className={`${className ?? ''} ${alignmentStyles.label}`.trim()} data-alert-rule-label>
      {required && (
        <span className={styles.requiredMark} aria-hidden="true">
          *
        </span>
      )}
      <span>{label}</span>
      {help && (
        <Tooltip title={help}>
          <QuestionCircleOutlined aria-label={help} className={styles.fieldHelpIcon} />
        </Tooltip>
      )}
      {colon && label && <span aria-hidden="true">:</span>}
    </span>
  );
}
