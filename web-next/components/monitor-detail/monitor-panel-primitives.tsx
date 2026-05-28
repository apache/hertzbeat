'use client';

import React from 'react';
import { HzMonitorSignalBars, HzMonitorStatGrid, type HzMonitorSignalBarItem, type HzMonitorStatGridItem } from '@hertzbeat/ui';

export type MonitorSignalBarItem = HzMonitorSignalBarItem;
export type MonitorStatItem = HzMonitorStatGridItem;
export const MonitorSignalBars = HzMonitorSignalBars;

export function MonitorStatGrid({
  items,
  columns = 3
}: {
  items: HzMonitorStatGridItem[];
  columns?: 2 | 3 | 4;
}) {
  return <HzMonitorStatGrid items={items} columns={columns} />;
}
