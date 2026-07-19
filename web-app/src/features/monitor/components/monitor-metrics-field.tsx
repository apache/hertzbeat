/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';

import type { MonitorMetricField, MonitorParamFormValue } from '../model/monitor-editor-model';
import type { RowEditorLabels } from './monitor-key-value-field';
import { nextStructuredRowId } from './monitor-structured-field-model';

export type MetricsEditorLabels = RowEditorLabels & {
  unit: string;
  type: string;
  numberType: string;
  stringType: string;
};
type MetricRow = Omit<MonitorMetricField, 'type'> & { id: number; type: 0 | 1 | null };
type MetricsFieldProps = {
  label: string;
  value: MonitorParamFormValue;
  onChange: (value: MonitorParamFormValue) => void;
  onValidityChange?: (valid: boolean) => void;
  labels: MetricsEditorLabels;
  required: boolean;
  disabled: boolean;
};

export function MetricsField({
  label,
  value,
  onChange,
  onValidityChange,
  labels,
  required,
  disabled
}: MetricsFieldProps) {
  const editor = useMetricRows(value, required, onChange, onValidityChange);
  return (
    <fieldset>
      <legend>{label}</legend>
      <Space direction="vertical" size="small">
        {editor.rows.map(row => (
          <MetricRowEditor
            key={row.id}
            row={row}
            duplicate={editor.duplicate.has(row.field.trim())}
            disabled={disabled}
            labels={labels}
            change={editor.change}
            remove={editor.remove}
          />
        ))}
        <Button aria-label={labels.add} disabled={disabled} icon={<PlusOutlined />} onClick={editor.add}>
          {labels.add}
        </Button>
        {editor.empty && (
          <Typography.Text type="danger" role="alert">
            {labels.emptyError}
          </Typography.Text>
        )}
        {editor.duplicate.size > 0 && (
          <Typography.Text type="danger" role="alert">
            {labels.duplicateError}
          </Typography.Text>
        )}
      </Space>
    </fieldset>
  );
}

function MetricRowEditor({
  row,
  duplicate,
  disabled,
  labels,
  change,
  remove
}: {
  row: MetricRow;
  duplicate: boolean;
  disabled: boolean;
  labels: MetricsEditorLabels;
  change: (id: number, patch: Partial<MetricRow>) => void;
  remove: (id: number) => void;
}) {
  return (
    <Space>
      <Input
        aria-label={labels.key}
        disabled={disabled}
        status={!row.field.trim() || duplicate ? 'error' : ''}
        value={row.field}
        onChange={event => change(row.id, { field: event.target.value })}
      />
      <Input
        aria-label={labels.unit}
        disabled={disabled}
        status={!row.unit.trim() ? 'error' : ''}
        value={row.unit}
        onChange={event => change(row.id, { unit: event.target.value })}
      />
      <Select
        aria-label={labels.type}
        disabled={disabled}
        status={row.type === null ? 'error' : ''}
        value={row.type}
        options={[
          { value: 0, label: labels.numberType },
          { value: 1, label: labels.stringType }
        ]}
        onChange={type => change(row.id, { type })}
      />
      <Button aria-label={labels.remove} disabled={disabled} icon={<DeleteOutlined />} onClick={() => remove(row.id)} />
    </Space>
  );
}

function useMetricRows(
  value: MonitorParamFormValue,
  required: boolean,
  onChange: (value: MonitorParamFormValue) => void,
  onValidityChange?: (valid: boolean) => void
) {
  const [rows, setRows] = useState<MetricRow[]>(() =>
    Array.isArray(value) ? value.map((row, id) => ({ ...row, id })) : []
  );
  const commit = (next: MetricRow[]) => {
    setRows(next);
    if (next.length === 0) {
      onValidityChange?.(!required);
      if (!required) onChange(null);
      return;
    }
    const fields = next.map(row => row.field.trim());
    const valid = next.every(completeMetricRow) && new Set(fields).size === fields.length;
    onValidityChange?.(valid);
    if (valid) onChange(next.map(metricValue));
  };
  const fields = rows.map(row => row.field.trim());
  return {
    rows,
    duplicate: new Set(fields.filter((field, index) => field && fields.indexOf(field) !== index)),
    empty: (required && rows.length === 0) || rows.some(row => !completeMetricRow(row)),
    add: () => commit([...rows, { id: nextStructuredRowId(rows), field: '', unit: '', type: null }]),
    remove: (id: number) => commit(rows.filter(row => row.id !== id)),
    change: (id: number, patch: Partial<MetricRow>) =>
      commit(rows.map(row => (row.id === id ? { ...row, ...patch } : row)))
  };
}

function completeMetricRow(row: MetricRow) {
  return Boolean(row.field.trim() && row.unit.trim() && row.type !== null);
}

function metricValue(row: MetricRow): MonitorMetricField {
  return {
    field: row.field.trim(),
    unit: row.unit.trim(),
    type: row.type as 0 | 1,
    ...(row.label === undefined ? {} : { label: row.label }),
    ...(row.i18n === undefined ? {} : { i18n: row.i18n })
  };
}
