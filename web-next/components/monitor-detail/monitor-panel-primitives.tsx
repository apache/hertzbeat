'use client';

import React from 'react';
import { ObservabilityStatGrid, type ObservabilityStatGridItem } from '../observability/stat-grid';

export type { ObservabilitySignalBarItem as MonitorSignalBarItem } from '../observability/signal-bars';
export type MonitorStatItem = ObservabilityStatGridItem;
export { ObservabilitySignalBars as MonitorSignalBars } from '../observability/signal-bars';

export function MonitorStatGrid({
  items,
  columns = 3
}: {
  items: ObservabilityStatGridItem[];
  columns?: 2 | 3 | 4;
}) {
  return <ObservabilityStatGrid items={items} columns={columns} tone="operator" />;
}
