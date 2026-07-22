/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Input, Select, Space } from 'antd';
import type { TFunction } from 'i18next';

import type { KeyValueDraftRow, MetricDraftRow } from '../model/plugin-params-contract';

let rowSequence = 0;

export function KeyValueRows(props: {
  value: unknown;
  keyLabel: string;
  valueLabel: string;
  t: TFunction;
  onChange: (value: unknown) => void;
}) {
  const rows = Array.isArray(props.value) ? props.value.filter(isKeyValueRow) : [];
  const emit = (next: KeyValueDraftRow[]) => {
    props.onChange(next);
  };
  const update = (id: string, field: 'key' | 'value', value: string) =>
    emit(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  return (
    <div>
      {rows.map(row => (
        <Space key={row.id}>
          <Input
            aria-label={props.keyLabel}
            placeholder={props.keyLabel}
            value={row.key}
            onChange={event => update(row.id, 'key', event.target.value)}
          />
          <Input
            aria-label={props.valueLabel}
            placeholder={props.valueLabel}
            value={row.value}
            onChange={event => update(row.id, 'value', event.target.value)}
          />
          <Button onClick={() => emit(rows.filter(item => item.id !== row.id))}>{props.t('common.delete')}</Button>
        </Space>
      ))}
      <Button onClick={() => emit([...rows, { id: nextId('key'), key: '', value: '' }])}>
        {props.t('common.add')}
      </Button>
    </div>
  );
}

export function MetricRows(props: { value: unknown; t: TFunction; onChange: (value: unknown) => void }) {
  const rows = Array.isArray(props.value) ? props.value.filter(isMetricRow) : [];
  const emit = (next: MetricDraftRow[]) => {
    props.onChange(next);
  };
  const updateText = (id: string, field: 'field' | 'unit', value: string) =>
    emit(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  const updateType = (id: string, type: 0 | 1) => emit(rows.map(row => (row.id === id ? { ...row, type } : row)));
  return (
    <div>
      {rows.map(row => (
        <Space key={row.id}>
          <Input
            aria-label={props.t('plugins.params.field')}
            value={row.field}
            onChange={event => updateText(row.id, 'field', event.target.value)}
          />
          <Input
            aria-label={props.t('plugins.params.unit')}
            value={row.unit}
            onChange={event => updateText(row.id, 'unit', event.target.value)}
          />
          <Select
            aria-label={props.t('plugins.params.type')}
            value={row.type}
            options={[
              { value: 0, label: props.t('plugins.params.number') },
              { value: 1, label: props.t('plugins.params.string') }
            ]}
            onChange={updateType.bind(null, row.id)}
          />
          <Button onClick={() => emit(rows.filter(item => item.id !== row.id))}>{props.t('common.delete')}</Button>
        </Space>
      ))}
      <Button onClick={() => emit([...rows, { id: nextId('metric'), field: '', unit: '', type: 0 }])}>
        {props.t('common.add')}
      </Button>
    </div>
  );
}

function nextId(prefix: string) {
  rowSequence += 1;
  return `new-${prefix}-${rowSequence}`;
}
function isKeyValueRow(value: unknown): value is KeyValueDraftRow {
  return (
    isRecord(value) && typeof value.id === 'string' && typeof value.key === 'string' && typeof value.value === 'string'
  );
}
function isMetricRow(value: unknown): value is MetricDraftRow {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.field === 'string' &&
    typeof value.unit === 'string' &&
    (value.type === 0 || value.type === 1)
  );
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
