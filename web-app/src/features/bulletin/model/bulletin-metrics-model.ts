/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { BulletinMetricField, BulletinMetrics } from './bulletin-model';

export type BulletinMetricCell = {
  key: string;
  monitor: string;
  host: string;
  metric: string;
  field: string;
  value: BulletinMetricField['value'];
  unit: BulletinMetricField['unit'];
  status: BulletinMetricField['status'];
};

export function hasBulletinMetricFields(metrics: BulletinMetrics) {
  return metrics.content.some(row => row.metrics.some(metric => metric.fields.some(sample => sample.length > 0)));
}

export function createBulletinMetricCells(metrics: BulletinMetrics): BulletinMetricCell[] {
  return metrics.content.flatMap((row, rowIndex) =>
    row.metrics.flatMap((metric, metricIndex) =>
      metric.fields.flatMap((sample, sampleIndex) =>
        sample.map((field, fieldIndex) => ({
          // Positional sample identity disambiguates repeated fields without leaking it into visible data.
          key: JSON.stringify([
            row.monitorId,
            row.host,
            metric.name,
            field.key,
            rowIndex,
            metricIndex,
            sampleIndex,
            fieldIndex
          ]),
          monitor: row.monitorName,
          host: row.host,
          metric: metric.name,
          field: field.key,
          value: field.value,
          unit: field.unit,
          status: field.status
        }))
      )
    )
  );
}
