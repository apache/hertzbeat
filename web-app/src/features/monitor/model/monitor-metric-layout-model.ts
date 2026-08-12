/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

const monitorMetricLayoutColumns = 12 as const;
const monitorMetricLayoutSchemaVersion = 1 as const;
const monitorMetricLayoutWidths = [4, 6, 8, 12] as const;
type MonitorMetricLayoutMode = 'auto' | 'custom';
export type MonitorMetricLayoutViewport = 'desktop' | 'tablet' | 'narrow';

export type MonitorMetricLayoutItem = {
  group: string;
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
  order: number;
};

export type MonitorMetricHistoryDock = { collapsed: boolean; height: number };

export type MonitorMetricLayoutDocument = {
  schemaVersion: typeof monitorMetricLayoutSchemaVersion;
  mode: MonitorMetricLayoutMode;
  columns: typeof monitorMetricLayoutColumns;
  items: MonitorMetricLayoutItem[];
  historyDock: MonitorMetricHistoryDock;
};

export type MonitorMetricLayoutResource = MonitorMetricLayoutDocument & {
  application: string;
  revision: string;
};

export type MonitorMetricLayoutState = {
  readState: 'loading' | 'ready' | 'unavailable' | 'invalid' | 'error';
  editing: boolean;
  saving: boolean;
  revision: string;
  hasSavedLayout: boolean;
  layout: MonitorMetricLayoutDocument;
};

export type MonitorMetricLayoutActions = {
  beginEdit: () => void;
  cancelEdit: () => void;
  changeItems: (items: MonitorMetricLayoutItem[]) => void;
  changeHistoryDock: (historyDock: MonitorMetricHistoryDock) => void;
  save: () => Promise<void>;
  reset: () => Promise<void>;
};

const defaultCardHeight = 10;
const defaultCardWidth = 4;

export function buildDefaultMonitorMetricLayout(groups: string[]): MonitorMetricLayoutDocument {
  return {
    schemaVersion: monitorMetricLayoutSchemaVersion,
    mode: 'auto',
    columns: monitorMetricLayoutColumns,
    items: uniqueGroups(groups).map((group, index) => ({
      group,
      x: (index % 3) * defaultCardWidth,
      y: Math.floor(index / 3) * defaultCardHeight,
      w: defaultCardWidth,
      h: defaultCardHeight,
      collapsed: false,
      order: index
    })),
    historyDock: { collapsed: false, height: 12 }
  };
}

export function mergeMonitorMetricLayout(
  resource: MonitorMetricLayoutResource | null | undefined,
  groups: string[]
): MonitorMetricLayoutDocument {
  const availableGroups = uniqueGroups(groups);
  if (!resource || resource.mode === 'auto') return buildDefaultMonitorMetricLayout(availableGroups);
  const available = new Set(availableGroups);
  const saved = [...resource.items]
    .filter(item => available.has(item.group))
    .sort((left, right) => left.order - right.order || left.y - right.y || left.x - right.x);
  const present = new Set(saved.map(item => item.group));
  const bottom = saved.reduce((maximum, item) => Math.max(maximum, item.y + item.h), 0);
  const appended = availableGroups
    .filter(group => !present.has(group))
    .map((group, index) => ({
      group,
      x: (index % 3) * defaultCardWidth,
      y: bottom + Math.floor(index / 3) * defaultCardHeight,
      w: defaultCardWidth,
      h: defaultCardHeight,
      collapsed: false,
      order: saved.length + index
    }));
  return { ...resource, items: [...saved, ...appended] };
}

export function projectMonitorMetricLayout(items: MonitorMetricLayoutItem[], viewport: MonitorMetricLayoutViewport) {
  const ordered = [...items].sort((left, right) => left.order - right.order);
  if (viewport === 'desktop') return ordered.map(item => ({ ...item }));
  if (viewport === 'narrow') return projectRows(ordered, 1, () => 1);
  return projectRows(ordered, 2, item => (item.w > 6 ? 6 : 3));
}

export function snapMonitorMetricLayoutItems(items: MonitorMetricLayoutItem[]) {
  const normalized = items
    .map(item => {
      const width = nearestWidth(item.w);
      return {
        ...item,
        x: clamp(item.x, 0, monitorMetricLayoutColumns - width),
        y: clamp(item.y, 0, 999),
        w: width,
        h: clamp(item.h, item.collapsed ? 4 : 8, 24)
      };
    })
    .sort((left, right) => left.y - right.y || left.x - right.x || left.order - right.order);
  const placed: MonitorMetricLayoutItem[] = [];
  for (const [order, item] of normalized.entries()) {
    const candidate = { ...item, order };
    while (placed.some(other => overlaps(candidate, other))) {
      candidate.y = Math.max(...placed.filter(other => overlaps(candidate, other)).map(other => other.y + other.h));
    }
    placed.push(candidate);
  }
  return placed;
}

export function mergeMonitorMetricGridChange(
  canonical: MonitorMetricLayoutItem[],
  changed: Array<Pick<MonitorMetricLayoutItem, 'group' | 'x' | 'y' | 'w' | 'h'>>
) {
  const changes = new Map(changed.map(item => [item.group, item]));
  return snapMonitorMetricLayoutItems(
    canonical.map(item => {
      const change = changes.get(item.group);
      return change ? { ...item, ...change } : item;
    })
  );
}

export function monitorMetricLayoutViewport(width: number): MonitorMetricLayoutViewport {
  if (width >= 1_260) return 'desktop';
  if (width >= 660) return 'tablet';
  return 'narrow';
}

function projectRows(
  items: MonitorMetricLayoutItem[],
  columnsPerRow: number,
  widthFor: (item: MonitorMetricLayoutItem) => number
) {
  const projected: MonitorMetricLayoutItem[] = [];
  let rowY = 0;
  for (let index = 0; index < items.length; index += columnsPerRow) {
    const row = items.slice(index, index + columnsPerRow);
    let x = 0;
    for (const item of row) {
      const width = widthFor(item);
      projected.push({ ...item, x, y: rowY, w: width });
      x += width;
    }
    rowY += Math.max(...row.map(item => item.h));
  }
  return projected;
}

function nearestWidth(width: number) {
  return [...monitorMetricLayoutWidths].sort(
    (left, right) => Math.abs(left - width) - Math.abs(right - width) || right - left
  )[0]!;
}

function overlaps(first: MonitorMetricLayoutItem, second: MonitorMetricLayoutItem) {
  return (
    first.x < second.x + second.w &&
    first.x + first.w > second.x &&
    first.y < second.y + second.h &&
    first.y + first.h > second.y
  );
}

function uniqueGroups(groups: string[]) {
  return [...new Set(groups.filter(Boolean))];
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}
