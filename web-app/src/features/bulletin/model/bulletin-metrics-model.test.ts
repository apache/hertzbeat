/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { BulletinMetrics } from './bulletin-model';
import { createBulletinMetricPivot, hasBulletinMetricFields } from './bulletin-metrics-model';

describe('Bulletin metrics model', () => {
  it('keeps repeated samples in one monitor row under a two-level metric column', () => {
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

    const pivot = createBulletinMetricPivot(metrics);

    expect(pivot.groups).toEqual([
      {
        metric: 'responseTime',
        fields: [{ key: 'duration', valueKey: '["responseTime","duration"]' }]
      }
    ]);
    expect(pivot.rows).toHaveLength(1);
    expect(pivot.rows[0]).toMatchObject({ monitor: 'site', monitorId: 7, host: 'localhost' });
    expect(pivot.rows[0]?.values['["responseTime","duration"]']).toEqual([
      { key: 'duration', unit: 'ms', value: '12', status: 'value' },
      { key: 'duration', unit: '', value: null, status: 'no-data' }
    ]);
  });

  it('unions metric fields without inventing zeroes for missing monitor values', () => {
    const metrics: BulletinMetrics = {
      name: 'Database',
      content: [
        {
          monitorName: 'primary',
          monitorId: 1,
          host: 'db-a',
          metrics: [
            {
              name: 'basic',
              fields: [[{ key: 'version', unit: '', value: '8.0', status: 'value' }]]
            }
          ]
        },
        {
          monitorName: 'replica',
          monitorId: 2,
          host: 'db-b',
          metrics: [
            {
              name: 'basic',
              fields: [[{ key: 'port', unit: '', value: '3306', status: 'value' }]]
            }
          ]
        }
      ]
    };

    const pivot = createBulletinMetricPivot(metrics);

    expect(pivot.groups[0]?.fields.map(field => field.key)).toEqual(['version', 'port']);
    expect(pivot.rows[0]?.values['["basic","port"]']).toEqual([]);
    expect(pivot.rows[1]?.values['["basic","version"]']).toEqual([]);
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
    expect(createBulletinMetricPivot(metrics)).toEqual({ groups: [], rows: [] });
  });
});
