/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  buildDefaultMonitorMetricLayout,
  mergeMonitorMetricLayout,
  projectMonitorMetricLayout,
  snapMonitorMetricLayoutItems
} from './monitor-metric-layout-model';

describe('monitor metric layout model', () => {
  it('creates a compact three-column canonical desktop intent', () => {
    const layout = buildDefaultMonitorMetricLayout(['basic', 'status', 'innodb', 'performance']);

    expect(layout).toMatchObject({ schemaVersion: 1, mode: 'auto', columns: 12 });
    expect(layout.items.map(item => [item.group, item.x, item.y, item.w, item.order])).toEqual([
      ['basic', 0, 0, 4, 0],
      ['status', 4, 0, 4, 1],
      ['innodb', 8, 0, 4, 2],
      ['performance', 0, 10, 4, 3]
    ]);
  });

  it('keeps saved geometry while appending newly discovered groups without overlap', () => {
    const merged = mergeMonitorMetricLayout(
      {
        application: 'mysql',
        revision: 'r1',
        schemaVersion: 1,
        mode: 'custom',
        columns: 12,
        items: [
          { group: 'status', x: 0, y: 0, w: 8, h: 12, collapsed: false, order: 0 },
          { group: 'basic', x: 8, y: 0, w: 4, h: 10, collapsed: false, order: 1 }
        ],
        historyDock: { collapsed: false, height: 12 }
      },
      ['basic', 'status', 'new_group']
    );

    expect(merged.items.slice(0, 2).map(item => item.group)).toEqual(['status', 'basic']);
    expect(merged.items[2]).toMatchObject({ group: 'new_group', y: 12, order: 2 });
  });

  it('projects without mutating canonical desktop geometry', () => {
    const canonical = buildDefaultMonitorMetricLayout(['a', 'b', 'c']);

    expect(projectMonitorMetricLayout(canonical.items, 'tablet')).toEqual([
      expect.objectContaining({ group: 'a', x: 0, y: 0, w: 3 }),
      expect.objectContaining({ group: 'b', x: 3, y: 0, w: 3 }),
      expect.objectContaining({ group: 'c', x: 0, y: 10, w: 3 })
    ]);
    expect(projectMonitorMetricLayout(canonical.items, 'narrow')).toEqual([
      expect.objectContaining({ group: 'a', x: 0, y: 0, w: 1 }),
      expect.objectContaining({ group: 'b', x: 0, y: 10, w: 1 }),
      expect.objectContaining({ group: 'c', x: 0, y: 20, w: 1 })
    ]);
    expect(canonical.items[1]).toMatchObject({ x: 4, y: 0, w: 4 });
  });

  it('snaps arbitrary drag widths and updates narrow-screen order deterministically', () => {
    const snapped = snapMonitorMetricLayoutItems([
      { group: 'b', x: 6, y: 0, w: 5, h: 9, collapsed: false, order: 1 },
      { group: 'a', x: 0, y: 0, w: 7, h: 13, collapsed: false, order: 0 }
    ]);

    expect(snapped).toEqual([
      { group: 'a', x: 0, y: 0, w: 8, h: 13, collapsed: false, order: 0 },
      { group: 'b', x: 6, y: 13, w: 6, h: 9, collapsed: false, order: 1 }
    ]);
  });
});
