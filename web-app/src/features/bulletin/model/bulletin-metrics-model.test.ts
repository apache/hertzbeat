/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { BulletinMetrics } from './bulletin-model';
import { createBulletinMetricCells, hasBulletinMetricFields } from './bulletin-metrics-model';

describe('Bulletin metrics model', () => {
  it('keeps repeated fields from separate samples as distinct stable rows', () => {
    const metrics: BulletinMetrics = {
      name: 'Ops',
      content: [
        {
          monitorName: 'site',
          monitorId: 7,
          host: 'localhost',
          metrics: [
            {
              name: 'responseTime',
              fields: [
                [{ key: 'duration', unit: 'ms', value: '12', status: 'value' }],
                [{ key: 'duration', unit: '', value: null, status: 'no-data' }]
              ]
            }
          ]
        }
      ]
    };

    const cells = createBulletinMetricCells(metrics);

    expect(cells).toHaveLength(2);
    expect(new Set(cells.map(cell => cell.key))).toHaveProperty('size', 2);
    expect(cells.map(cell => ({ field: cell.field, status: cell.status, value: cell.value }))).toEqual([
      { field: 'duration', status: 'value', value: '12' },
      { field: 'duration', status: 'no-data', value: null }
    ]);
  });

  it('reports no rendered evidence when metric groups contain no fields', () => {
    const metrics: BulletinMetrics = {
      name: 'Ops',
      content: [
        {
          monitorName: 'site',
          monitorId: 7,
          host: 'localhost',
          metrics: [{ name: 'responseTime', fields: [[], []] }]
        }
      ]
    };

    expect(hasBulletinMetricFields(metrics)).toBe(false);
    expect(createBulletinMetricCells(metrics)).toEqual([]);
  });
});
