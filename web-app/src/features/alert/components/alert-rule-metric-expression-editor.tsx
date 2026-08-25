/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { SnippetsOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Tag, type MenuProps } from 'antd';
import type { ComponentRef } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { metricAlertFieldTypeKey, metricAlertFieldTypes, type MetricAlertField } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';

const expressionOperators = ['==', '!=', '>', '>=', '<', '<=', '&&', '||', '()'] as const;
const defaultMaximumExpressionLength = 100;

type MetricExpressionEditorProps = {
  busy: boolean;
  condition: string;
  fields: MetricAlertField[];
  change: (condition: string) => void;
  label?: string;
  maximumLength?: number;
  placeholder?: string;
};

/** Mirrors the Angular threshold expression editor while keeping the target clauses model-owned. */
export function AlertRuleMetricExpressionEditor(props: MetricExpressionEditorProps) {
  const { t } = useTranslation();
  const label = props.label ?? t('alertRules.metricCondition.expertExpression');
  const maximumLength = props.maximumLength ?? defaultMaximumExpressionLength;
  const placeholder = props.placeholder ?? t('alertRules.metricCondition.expressionPlaceholder');
  const textareaRef = useRef<ComponentRef<typeof Input.TextArea> | null>(null);
  const preservedSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const insertables = expressionInsertables(props.fields);
  const items: MenuProps['items'] = [
    ...props.fields.map((field, index) => ({
      key: `field:${index}`,
      label: (
        <span className={styles.expressionMenuItem}>
          <code>{field.value}</code>
          <span>{field.label}</span>
          <Tag color={field.type === metricAlertFieldTypes.number ? 'success' : 'processing'}>
            {t(`alertRules.metricCondition.expressionTypes.${metricAlertFieldTypeKey(field.type)}`)}
          </Tag>
        </span>
      )
    })),
    { type: 'divider' },
    ...expressionOperators.map((operator, index) => ({
      key: `operator:${index}`,
      label: (
        <span className={styles.expressionMenuItem}>
          <code>{operator}</code>
          <span>{t(`alertRules.metricCondition.operators.${operator}`)}</span>
        </span>
      )
    }))
  ];

  function insert(key: string) {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    const value = insertables.get(key);
    if (!textarea || !value) return;
    const selectionStart = preservedSelectionRef.current?.start ?? textarea.selectionStart;
    const selectionEnd = preservedSelectionRef.current?.end ?? textarea.selectionEnd;
    preservedSelectionRef.current = null;
    const inserted = insertExpressionToken(props.condition, selectionStart, selectionEnd, value);
    if (inserted.value.length > maximumLength) return;
    props.change(inserted.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(inserted.cursor, inserted.cursor);
    });
  }

  return (
    <div className={styles.conditionExpert}>
      <div className={styles.expressionInputWrapper}>
        <Dropdown
          menu={{ items, onClick: event => insert(event.key) }}
          overlayClassName={styles.expressionDropdown ?? ''}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            aria-label={t('alertRules.metricCondition.insertExpression')}
            className={styles.expressionInsertButton ?? ''}
            disabled={props.busy}
            icon={<SnippetsOutlined />}
            onMouseDown={() => {
              const textarea = textareaRef.current?.resizableTextArea?.textArea;
              if (textarea) {
                preservedSelectionRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
              }
            }}
            type="text"
          />
        </Dropdown>
        <Input.TextArea
          ref={textareaRef}
          aria-label={label}
          disabled={props.busy}
          maxLength={maximumLength}
          placeholder={placeholder}
          rows={3}
          showCount
          value={props.condition}
          onChange={event => props.change(event.target.value)}
        />
      </div>
    </div>
  );
}

function expressionInsertables(fields: MetricAlertField[]) {
  return new Map<string, string>([
    ...fields.map((field, index) => [`field:${index}`, field.value] as const),
    ...expressionOperators.map((operator, index) => [`operator:${index}`, operator] as const)
  ]);
}

function insertExpressionToken(source: string, start: number, end: number, token: string) {
  const before = source.slice(0, start).replace(/\s+$/, '');
  const selected = source.slice(start, end);
  const after = source.slice(end).replace(/^\s+/, '');
  const inserted = token === '()' && selected ? `(${selected})` : token;
  const left = before ? `${before} ` : '';
  const right = after ? ` ${after}` : '';
  const value = `${left}${inserted}${right}`;
  const cursor = token === '()' && !selected ? left.length + 1 : left.length + inserted.length;
  return { cursor, value };
}
