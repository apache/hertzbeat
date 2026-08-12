/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { MonitorMetricLayoutContractError, parseMonitorMetricLayout } from './monitor-metric-layout-schema';

describe('monitor metric layout schema', () => {
  it('keeps missing and configured layouts distinct', () => {
    expect(parseMonitorMetricLayout(null)).toBeNull();
    expect(parseMonitorMetricLayout(layout())).toEqual(layout());
  });

  it.each([
    { ...layout(), columns: 6 },
    { ...layout(), password: 'must-not-pass' },
    { ...layout(), items: [{ ...layout().items[0], w: 5 }] },
    { ...layout(), items: [layout().items[0], { ...layout().items[0], order: 1 }] }
  ])('rejects malformed, expanded, or ambiguous documents', value => {
    expect(() => parseMonitorMetricLayout(value)).toThrow(MonitorMetricLayoutContractError);
  });
});

function layout() {
  return {
    application: 'mysql',
    revision: 'layout-r1',
    schemaVersion: 1,
    mode: 'custom',
    columns: 12,
    items: [{ group: 'basic', x: 0, y: 0, w: 6, h: 10, collapsed: false, order: 0 }],
    historyDock: { collapsed: false, height: 12 }
  } as const;
}
