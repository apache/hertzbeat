/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Input, Space, Typography } from 'antd';
import { useState } from 'react';

import type { LabelSuggestionCatalog } from '@/shared/labels/label-suggestion-model';

import type { MonitorParamFormValue } from '../model/monitor-editor-model';
import styles from './monitor-key-value-field.module.css';
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
  suggestions?: LabelSuggestionCatalog;
};

export function KeyValueField({
  label,
  value,
  onChange,
  onValidityChange,
  labels,
  disabled,
  suggestions
}: KeyValueFieldProps) {
  const editor = useKeyValueRows(value, onChange, onValidityChange);
  const keyOptions = suggestionOptions(
    suggestions?.keys ?? [],
    editor.rows.map(row => row.key)
  );
  return (
    <fieldset>
      <legend>{label}</legend>
      <Space direction="vertical" size="small">
        {editor.rows.map(row => (
          <Space key={row.id}>
            <MapRowInput
              aria-label={labels.key}
              disabled={disabled}
              status={!row.key.trim() || editor.duplicateKeys.has(row.key.trim()) ? 'error' : ''}
              value={row.key}
              {...(suggestions ? { options: keyOptions } : {})}
              onChange={next => editor.changeKey(row.id, next, Boolean(suggestions))}
            />
            <MapRowInput
              aria-label={labels.value}
              disabled={disabled}
              value={row.value}
              {...(suggestions ? { options: valueOptions(row, editor.rows, suggestions) } : {})}
              onChange={next => editor.changeValue(row.id, next)}
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

function MapRowInput({
  options,
  onChange,
  ...props
}: {
  options?: string[];
  onChange: (value: string) => void;
  'aria-label': string;
  disabled: boolean;
  value: string;
  status?: '' | 'error';
}) {
  if (options) {
    return (
      <AutoComplete
        {...props}
        className={styles.input ?? ''}
        options={options.map(value => ({ value }))}
        filterOption={(input, option) => option?.value.toLowerCase().includes(input.toLowerCase()) ?? false}
        onChange={onChange}
      />
    );
  }
  return <Input {...props} onChange={event => onChange(event.target.value)} />;
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
    changeKey: (id: number, key: string, clearValue: boolean) =>
      commit(rows.map(row => (row.id === id ? { ...row, key, ...(clearValue ? { value: '' } : {}) } : row))),
    changeValue: (id: number, value: string) => commit(rows.map(row => (row.id === id ? { ...row, value } : row)))
  };
}

function initialMapRows(value: MonitorParamFormValue): MapRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, entry], id) => ({ id, key, value: entry }));
}

function valueOptions(row: MapRow, rows: MapRow[], suggestions: LabelSuggestionCatalog) {
  const key = row.key.trim();
  return suggestionOptions(
    suggestions.valuesByKey[key] ?? [],
    rows.filter(candidate => candidate.key.trim() === key).map(candidate => candidate.value)
  );
}

function suggestionOptions(...sources: string[][]) {
  return [
    ...new Set(
      sources
        .flat()
        .map(value => value.trim())
        .filter(Boolean)
    )
  ].sort();
}
