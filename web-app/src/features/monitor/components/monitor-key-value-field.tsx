/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Space, Typography } from 'antd';
import { useState } from 'react';

import type { MonitorParamFormValue } from '../model/monitor-editor-model';
import { nextStructuredRowId } from './monitor-structured-field-model';

export type RowEditorLabels = {
  add: string;
  remove: string;
  key: string;
  value: string;
  emptyError: string;
  duplicateError: string;
};

type MapRow = { id: number; key: string; value: string };
type KeyValueFieldProps = {
  label: string;
  value: MonitorParamFormValue;
  onChange: (value: MonitorParamFormValue) => void;
  onValidityChange?: (valid: boolean) => void;
  labels: RowEditorLabels;
  disabled: boolean;
};

export function KeyValueField({ label, value, onChange, onValidityChange, labels, disabled }: KeyValueFieldProps) {
  const editor = useKeyValueRows(value, onChange, onValidityChange);
  return (
    <fieldset>
      <legend>{label}</legend>
      <Space direction="vertical" size="small">
        {editor.rows.map(row => (
          <Space key={row.id}>
            <Input
              aria-label={labels.key}
              disabled={disabled}
              status={!row.key.trim() || editor.duplicateKeys.has(row.key.trim()) ? 'error' : ''}
              value={row.key}
              onChange={event => editor.change(row.id, 'key', event.target.value)}
            />
            <Input
              aria-label={labels.value}
              disabled={disabled}
              value={row.value}
              onChange={event => editor.change(row.id, 'value', event.target.value)}
            />
            <Button
              aria-label={labels.remove}
              disabled={disabled}
              icon={<DeleteOutlined />}
              onClick={() => editor.remove(row.id)}
            />
          </Space>
        ))}
        <Button aria-label={labels.add} disabled={disabled} icon={<PlusOutlined />} onClick={editor.add}>
          {labels.add}
        </Button>
        {editor.empty && (
          <Typography.Text type="danger" role="alert">
            {labels.emptyError}
          </Typography.Text>
        )}
        {editor.duplicateKeys.size > 0 && (
          <Typography.Text type="danger" role="alert">
            {labels.duplicateError}
          </Typography.Text>
        )}
      </Space>
    </fieldset>
  );
}

function useKeyValueRows(
  value: MonitorParamFormValue,
  onChange: (value: MonitorParamFormValue) => void,
  onValidityChange?: (valid: boolean) => void
) {
  const [rows, setRows] = useState<MapRow[]>(() => initialMapRows(value));
  const commit = (next: MapRow[]) => {
    setRows(next);
    if (next.length === 0) {
      onValidityChange?.(true);
      onChange('');
      return;
    }
    const keys = next.map(row => row.key.trim());
    const valid = keys.every(Boolean) && new Set(keys).size === keys.length;
    onValidityChange?.(valid);
    if (valid) onChange(Object.fromEntries(next.map(row => [row.key.trim(), row.value])));
  };
  const keys = rows.map(row => row.key.trim());
  return {
    rows,
    duplicateKeys: new Set(keys.filter((key, index) => key && keys.indexOf(key) !== index)),
    empty: keys.some(key => !key),
    add: () => commit([...rows, { id: nextStructuredRowId(rows), key: '', value: '' }]),
    remove: (id: number) => commit(rows.filter(row => row.id !== id)),
    change: (id: number, field: 'key' | 'value', next: string) =>
      commit(rows.map(row => (row.id === id ? { ...row, [field]: next } : row)))
  };
}

function initialMapRows(value: MonitorParamFormValue): MapRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, entry], id) => ({ id, key, value: entry }));
}
