/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Table, Tag, type TableColumnsType } from 'antd';
import type { ReactNode } from 'react';

import type { monitorRealtimeRows } from '../model/monitor-detail-model';
import styles from './monitor-realtime-table.module.css';

type RealtimeRow = ReturnType<typeof monitorRealtimeRows>[number];
type MatrixRow = { key: string } & Record<string, ReactNode>;

export function MatrixRealtimeTable({ rows, pending }: { rows: RealtimeRow[]; pending: boolean }) {
  const { columns, data } = realtimeMatrix(rows);
  return (
    <Table
      rowKey="key"
      size="small"
      loading={pending}
      dataSource={data}
      columns={columns}
      pagination={false}
      scroll={{ x: 'max-content' }}
    />
  );
}

function realtimeMatrix(rows: RealtimeRow[]) {
  const labelKeys = unique(rows.flatMap(row => Object.keys(row.labels)));
  const fields = unique(rows.map(row => row.field));
  const units = new Map(rows.map(row => [row.field, row.unit]));
  const samples = new Map<string, MatrixRow>();
  for (const row of rows) {
    const key = sampleKey(row);
    const sample = samples.get(key) ?? { key };
    for (const label of labelKeys) sample[`label:${label}`] = row.labels[label] ?? '—';
    sample[`field:${row.field}`] = row.value;
    samples.set(key, sample);
  }
  const columns: TableColumnsType<MatrixRow> = [
    ...labelKeys.map(label => ({ title: label, dataIndex: `label:${label}` })),
    ...fields.map(field => ({ title: renderField(field, units.get(field)), dataIndex: `field:${field}` }))
  ];
  return { columns, data: [...samples.values()] };
}

function renderField(field: string, unit?: string | null) {
  return (
    <span className={styles.realtimeField}>
      <span>{field}</span>
      {unit ? <Tag bordered={false}>{unit}</Tag> : null}
    </span>
  );
}

function sampleKey(row: RealtimeRow) {
  const separator = row.key.indexOf(':');
  return separator < 0 ? row.key : row.key.slice(0, separator);
}

function unique(values: string[]) {
  return [...new Set(values)];
}
