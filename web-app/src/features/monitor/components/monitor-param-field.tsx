/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Radio, Select, Space, Switch, Typography } from 'antd';
import { useState } from 'react';

import type { MonitorParamDefine } from '../api/monitor-api';
import type { MonitorMetricField, MonitorParamFormValue } from '../model/monitor-editor-model';
import { numberDefineRange } from '../model/monitor-param-codec';

type RowEditorLabels = {
  add: string;
  remove: string;
  key: string;
  value: string;
  emptyError: string;
  duplicateError: string;
};

type MonitorParamFieldProps = {
  define: MonitorParamDefine;
  label: string;
  value: MonitorParamFormValue;
  onChange: (value: MonitorParamFormValue) => void;
  onValidityChange?: (valid: boolean) => void;
  mapLabels: RowEditorLabels;
  metricsLabels: RowEditorLabels & { unit: string; type: string; numberType: string; stringType: string };
};

export function MonitorParamField({ define, label, value, onChange, onValidityChange, mapLabels,
  metricsLabels }: MonitorParamFieldProps) {
  const props = { define, label, value, onChange };
  if (define.type === 'boolean') return <BooleanField {...props} />;
  if (define.type === 'number') return <NumberField {...props} />;
  if (define.type === 'radio') return <RadioField {...props} />;
  if (define.type === 'key-value') {
    return <KeyValueField label={label} value={value} onChange={onChange}
      {...(onValidityChange ? { onValidityChange } : {})} labels={mapLabels} />;
  }
  if (define.type === 'metrics-field') {
    return <MetricsField label={label} value={value} onChange={onChange}
      {...(onValidityChange ? { onValidityChange } : {})} labels={metricsLabels} />;
  }
  return <TextField {...props} />;
}

type SimpleFieldProps = Pick<MonitorParamFieldProps, 'define' | 'label' | 'value' | 'onChange'>;

function BooleanField({ label, value, onChange }: SimpleFieldProps) {
  return <label>{label}<Switch checked={value === true} onChange={onChange} /></label>;
}

function NumberField({ define, label, value, onChange }: SimpleFieldProps) {
  const range = numberDefineRange(define);
  return <label>{label}<InputNumber<number> value={typeof value === 'number' ? value : null}
    {...(range ? { min: range.min, max: range.max } : {})} onChange={onChange} /></label>;
}

function RadioField({ define, label, value, onChange }: SimpleFieldProps) {
  return <fieldset><legend>{label}</legend><Radio.Group value={typeof value === 'string' ? value : null}
    options={define.options ?? []} onChange={event => onChange(event.target.value as string)} /></fieldset>;
}

function TextField({ define, label, value, onChange }: SimpleFieldProps) {
  const common = { value: typeof value === 'string' ? value : '',
    ...(define.placeholder === null ? {} : { placeholder: define.placeholder }),
    ...(define.limit === null ? {} : { maxLength: define.limit }), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  if (define.type === 'password') return <label>{label}<Input.Password {...common} /></label>;
  if (define.type === 'textarea') return <label>{label}<Input.TextArea {...common} /></label>;
  return <label>{label}<Input {...common} /></label>;
}

type MapRow = { id: number; key: string; value: string };

function KeyValueField({ label, value, onChange, onValidityChange, labels }: {
  label: string;
  value: MonitorParamFormValue;
  onChange: (value: MonitorParamFormValue) => void;
  onValidityChange?: (valid: boolean) => void;
  labels: MonitorParamFieldProps['mapLabels'];
}) {
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
    if (valid) onChange(Object.fromEntries(next.map((row, index) => [keys[index]!, row.value])));
  };
  const keys = rows.map(row => row.key.trim());
  const duplicateKeys = new Set(keys.filter((key, index) => key && keys.indexOf(key) !== index));
  const empty = keys.some(key => !key);
  return <fieldset>
    <legend>{label}</legend>
    <Space direction="vertical" size="small">
      {rows.map(row => <Space key={row.id}>
        <Input aria-label={labels.key} status={!row.key.trim() || duplicateKeys.has(row.key.trim()) ? 'error' : ''}
          value={row.key}
          onChange={event => commit(rows.map(item => item.id === row.id ? { ...item, key: event.target.value } : item))} />
        <Input aria-label={labels.value} value={row.value}
          onChange={event => commit(rows.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} />
        <Button aria-label={labels.remove} icon={<DeleteOutlined />}
          onClick={() => commit(rows.filter(item => item.id !== row.id))} />
      </Space>)}
      <Button aria-label={labels.add} icon={<PlusOutlined />}
        onClick={() => commit([...rows, { id: nextRowId(rows), key: '', value: '' }])}>
        {labels.add}
      </Button>
      {empty && <Typography.Text type="danger" role="alert">{labels.emptyError}</Typography.Text>}
      {duplicateKeys.size > 0 && <Typography.Text type="danger" role="alert">{labels.duplicateError}</Typography.Text>}
    </Space>
  </fieldset>;
}

function initialMapRows(value: MonitorParamFormValue): MapRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, entry], id) => ({ id, key, value: entry }));
}

function nextRowId(rows: Array<{ id: number }>) {
  return rows.reduce((maximum, row) => Math.max(maximum, row.id), -1) + 1;
}

type MetricRow = Omit<MonitorMetricField, 'type'> & { id: number; type: 0 | 1 | null };

function MetricsField({ label, value, onChange, onValidityChange, labels }: {
  label: string;
  value: MonitorParamFormValue;
  onChange: (value: MonitorParamFormValue) => void;
  onValidityChange?: (valid: boolean) => void;
  labels: MonitorParamFieldProps['metricsLabels'];
}) {
  const [rows, setRows] = useState<MetricRow[]>(() => Array.isArray(value)
    ? value.map((row, id) => ({ ...row, id })) : []);
  const commit = (next: MetricRow[]) => {
    setRows(next);
    const fields = next.map(row => row.field.trim());
    const valid = next.length > 0 && next.every(row => row.field.trim() && row.unit.trim() && row.type !== null)
      && new Set(fields).size === fields.length;
    onValidityChange?.(valid);
    if (valid) onChange(next.map(metricValue));
  };
  const fields = rows.map(row => row.field.trim());
  const duplicate = new Set(fields.filter((field, index) => field && fields.indexOf(field) !== index));
  const empty = rows.length === 0 || rows.some(row => !row.field.trim() || !row.unit.trim() || row.type === null);
  return <fieldset><legend>{label}</legend><Space direction="vertical" size="small">
    {rows.map(row => <Space key={row.id}>
      <Input aria-label={labels.key} status={!row.field.trim() || duplicate.has(row.field.trim()) ? 'error' : ''}
        value={row.field} onChange={event => commit(rows.map(item => item.id === row.id
          ? { ...item, field: event.target.value } : item))} />
      <Input aria-label={labels.unit} status={!row.unit.trim() ? 'error' : ''} value={row.unit}
        onChange={event => commit(rows.map(item => item.id === row.id ? { ...item, unit: event.target.value } : item))} />
      <Select aria-label={labels.type} status={row.type === null ? 'error' : ''} value={row.type}
        options={[{ value: 0, label: labels.numberType }, { value: 1, label: labels.stringType }]}
        onChange={type => commit(rows.map(item => item.id === row.id ? { ...item, type } : item))} />
      <Button aria-label={labels.remove} icon={<DeleteOutlined />}
        onClick={() => commit(rows.filter(item => item.id !== row.id))} />
    </Space>)}
    <Button aria-label={labels.add} icon={<PlusOutlined />} onClick={() => commit([...rows,
      { id: nextRowId(rows), field: '', unit: '', type: null }])}>{labels.add}</Button>
    {empty && <Typography.Text type="danger" role="alert">{labels.emptyError}</Typography.Text>}
    {duplicate.size > 0 && <Typography.Text type="danger" role="alert">{labels.duplicateError}</Typography.Text>}
  </Space></fieldset>;
}

function metricValue(row: MetricRow): MonitorMetricField {
  return { field: row.field.trim(), unit: row.unit.trim(), type: row.type as 0 | 1,
    ...(row.label === undefined ? {} : { label: row.label }), ...(row.i18n === undefined ? {} : { i18n: row.i18n }) };
}
