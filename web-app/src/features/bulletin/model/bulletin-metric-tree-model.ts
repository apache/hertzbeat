/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { MonitorAppHierarchyNode } from '@/features/monitor';

import type { BulletinFields } from './bulletin-model';

export class BulletinMetricTreeError extends Error {
  constructor() {
    super('Bulletin metric hierarchy is invalid');
    this.name = 'BulletinMetricTreeError';
  }
}

export type BulletinMetricTreeFieldNode = {
  key: string;
  title: string;
  isLeaf: true;
  metric: string;
  field: string;
};

export type BulletinMetricTreeMetricNode = {
  key: string;
  title: string;
  isLeaf: false;
  metric: string;
  children: BulletinMetricTreeFieldNode[];
};

export type BulletinMetricTreeSelection = {
  checkedKeys: string[];
  unknownFields: BulletinFields;
};

function metricKey(metric: string) {
  return JSON.stringify(['metric', metric]);
}

function fieldKey(metric: string, field: string) {
  return JSON.stringify(['field', metric, field]);
}

/** Keys encode semantic paths so backend reordering cannot move checkbox state to another field. */
export function buildBulletinMetricTree(root: MonitorAppHierarchyNode): BulletinMetricTreeMetricNode[] {
  if (root.isLeaf) throw new BulletinMetricTreeError();
  const metrics = new Set<string>();
  return root.children.map(metric => {
    if (metric.isLeaf || metrics.has(metric.value)) throw new BulletinMetricTreeError();
    metrics.add(metric.value);
    const fields = new Set<string>();
    const children = metric.children.map(field => {
      if (!field.isLeaf || field.children.length || fields.has(field.value)) throw new BulletinMetricTreeError();
      fields.add(field.value);
      return {
        key: fieldKey(metric.value, field.value), title: field.label ?? field.value,
        isLeaf: true as const, metric: metric.value, field: field.value
      };
    });
    return {
      key: metricKey(metric.value), title: metric.label ?? metric.value,
      isLeaf: false as const, metric: metric.value, children
    };
  });
}

function canonicalFields(fields: Map<string, Set<string>>): BulletinFields {
  return Object.fromEntries([...fields.entries()]
    .filter(([, values]) => values.size > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([metric, values]) => [metric, [...values].sort()]));
}

/** Parent keys are display state only; persisted bulletin fields always come from checked leaves. */
export function fieldsFromMetricTreeKeys(tree: BulletinMetricTreeMetricNode[], checkedKeys: readonly string[]) {
  const nodes = new Map<string, BulletinMetricTreeMetricNode | BulletinMetricTreeFieldNode>();
  tree.forEach(metric => {
    nodes.set(metric.key, metric);
    metric.children.forEach(field => nodes.set(field.key, field));
  });
  const selected = new Map<string, Set<string>>();
  for (const key of new Set(checkedKeys)) {
    const node = nodes.get(key);
    if (!node) throw new BulletinMetricTreeError();
    if (!node.isLeaf) continue;
    const fields = selected.get(node.metric) ?? new Set<string>();
    fields.add(node.field);
    selected.set(node.metric, fields);
  }
  return canonicalFields(selected);
}

/** Backfill reports removed schema entries instead of silently presenting an apparently valid edit. */
export function resolveSavedMetricTreeSelection(
  tree: BulletinMetricTreeMetricNode[], savedFields: BulletinFields
): BulletinMetricTreeSelection {
  const known = new Map(tree.map(metric => [metric.metric, new Set(metric.children.map(field => field.field))]));
  const selected = new Set<string>();
  const unknown = new Map<string, Set<string>>();
  for (const [rawMetric, rawFields] of Object.entries(savedFields)) {
    const metric = rawMetric.trim();
    for (const rawField of rawFields) {
      const field = rawField.trim();
      if (metric && field && known.get(metric)?.has(field)) selected.add(fieldKey(metric, field));
      else {
        const values = unknown.get(metric) ?? new Set<string>();
        values.add(field);
        unknown.set(metric, values);
      }
    }
  }
  const checkedKeys = tree.flatMap(metric => metric.children.map(field => field.key)).filter(key => selected.has(key));
  return { checkedKeys, unknownFields: canonicalFields(unknown) };
}
