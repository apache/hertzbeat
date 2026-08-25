/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../shared/alert-rule-editor.module.css';

export function AlertRuleMapField(props: {
  value: Record<string, string>;
  busy: boolean;
  addLabelKey: 'alertRules.map.addLabel' | 'alertRules.map.addAnnotation';
  change: (value: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const [pendingKey, setPendingKey] = useState('');
  const [pendingValue, setPendingValue] = useState('');
  const add = () => {
    const key = pendingKey.trim();
    const value = pendingValue.trim();
    if (!key || !value || Object.hasOwn(props.value, key)) return;
    props.change({ ...props.value, [key]: value });
    setPendingKey('');
    setPendingValue('');
  };
  return (
    <div className={styles.mapEditor}>
      {Object.entries(props.value).map(([key, value]) => (
        <div className={styles.mapRow} key={key}>
          <Input
            aria-label={t('alertRules.map.key')}
            disabled={props.busy}
            defaultValue={key}
            onBlur={event => {
              const renamed = renameKey(props.value, key, event.target.value);
              if (renamed === props.value) event.currentTarget.value = key;
              else props.change(renamed);
            }}
          />
          <span aria-hidden="true">:</span>
          <Input
            aria-label={t('alertRules.map.value')}
            disabled={props.busy}
            value={value}
            onChange={event => props.change({ ...props.value, [key]: event.target.value })}
          />
          <Button
            aria-label={t('alertRules.map.remove')}
            disabled={props.busy}
            icon={<DeleteOutlined />}
            onClick={() => props.change(withoutKey(props.value, key))}
          />
        </div>
      ))}
      <div className={styles.mapRow}>
        <Input
          aria-label={t('alertRules.map.key')}
          disabled={props.busy}
          placeholder={t('alertRules.map.key')}
          value={pendingKey}
          onChange={event => setPendingKey(event.target.value)}
        />
        <span aria-hidden="true">:</span>
        <Input
          aria-label={t('alertRules.map.value')}
          disabled={props.busy}
          placeholder={t('alertRules.map.value')}
          value={pendingValue}
          onChange={event => setPendingValue(event.target.value)}
          onPressEnter={add}
        />
        <Button
          aria-label={t(props.addLabelKey)}
          disabled={
            props.busy || !pendingKey.trim() || !pendingValue.trim() || Object.hasOwn(props.value, pendingKey.trim())
          }
          icon={<PlusOutlined />}
          onClick={add}
        />
      </div>
    </div>
  );
}

function withoutKey(value: Record<string, string>, key: string) {
  const result = { ...value };
  delete result[key];
  return result;
}

function renameKey(value: Record<string, string>, previous: string, next: string) {
  const key = next.trim();
  if (!key || (key !== previous && Object.hasOwn(value, key))) return value;
  const result: Record<string, string> = {};
  for (const [currentKey, currentValue] of Object.entries(value)) {
    result[currentKey === previous ? key : currentKey] = currentValue;
  }
  return result;
}
