/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { MonitorAppHierarchyNode } from '@/features/monitor';

import {
  BulletinMetricTreeError,
  buildBulletinMetricTree,
  fieldsFromMetricTreeKeys,
  resolveSavedMetricTreeSelection
} from './bulletin-metric-tree-model';

const hierarchy: MonitorAppHierarchyNode = {
  category: 'network',
  value: 'website',
  label: 'Website',
  isLeaf: false,
  hide: false,
  type: null,
  unit: null,
  children: [
    {
      category: null,
      value: 'summary',
      label: 'Summary',
      isLeaf: false,
      hide: null,
      type: null,
      unit: null,
      children: [
        {
          category: null,
          value: 'status',
          label: 'Status',
          isLeaf: true,
          hide: null,
          type: 0,
          unit: null,
          children: []
        },
        {
          category: null,
          value: 'responseTime',
          label: 'Response time',
          isLeaf: true,
          hide: null,
          type: 0,
          unit: 'ms',
          children: []
        }
      ]
    },
    {
      category: null,
      value: 'availability',
      label: 'Availability',
      isLeaf: false,
      hide: null,
      type: null,
      unit: null,
      children: [
        {
          category: null,
          value: 'status',
          label: 'Status',
          isLeaf: true,
          hide: null,
          type: 0,
          unit: null,
          children: []
        }
      ]
    }
  ]
};

describe('bulletin metric tree model', () => {
  it('creates stable structural keys that do not collide for equal field names under different metrics', () => {
    const first = buildBulletinMetricTree(hierarchy);
    const reordered = buildBulletinMetricTree({ ...hierarchy, children: [...hierarchy.children].reverse() });

    expect(first.map(node => node.key)).toEqual(['["metric","summary"]', '["metric","availability"]']);
    expect(first[0]?.children.map(node => node.key)).toContain('["field","summary","status"]');
    expect(first[1]?.children.map(node => node.key)).toContain('["field","availability","status"]');
    expect(new Set(first.flatMap(node => [node.key, ...node.children.map(child => child.key)]))).toHaveProperty(
      'size',
      5
    );
    expect(reordered.find(node => node.metric === 'summary')).toEqual(first.find(node => node.metric === 'summary'));
  });

  it('converts checked leaves only and canonicalizes select-all, partial, and uncheck-all payloads', () => {
    const tree = buildBulletinMetricTree(hierarchy);
    const allKeys = tree.flatMap(node => [node.key, ...node.children.map(child => child.key)]);

    expect(fieldsFromMetricTreeKeys(tree, allKeys)).toEqual({
      availability: ['status'],
      summary: ['responseTime', 'status']
    });
    expect(fieldsFromMetricTreeKeys(tree, [tree[0]!.key, tree[0]!.children[0]!.key])).toEqual({ summary: ['status'] });
    expect(fieldsFromMetricTreeKeys(tree, [])).toEqual({});
    expect(fieldsFromMetricTreeKeys(tree, [tree[0]!.children[0]!.key, tree[0]!.children[0]!.key])).toEqual({
      summary: ['status']
    });
  });

  it('backfills known saved leaves and reports unknown saved fields explicitly', () => {
    const tree = buildBulletinMetricTree(hierarchy);
    expect(
      resolveSavedMetricTreeSelection(tree, {
        summary: ['status', 'removed', 'status'],
        missingMetric: ['value']
      })
    ).toEqual({
      checkedKeys: ['["field","summary","status"]'],
      unknownFields: { missingMetric: ['value'], summary: ['removed'] }
    });
  });

  it('keeps a backend metric with no fields visible but never creates an empty payload entry', () => {
    const tree = buildBulletinMetricTree({
      ...hierarchy,
      children: [{ ...hierarchy.children[0]!, value: 'empty', label: 'Empty metric', children: [] }]
    });

    expect(tree).toEqual([
      {
        key: '["metric","empty"]',
        title: 'Empty metric',
        isLeaf: false,
        metric: 'empty',
        children: []
      }
    ]);
    expect(fieldsFromMetricTreeKeys(tree, [tree[0]!.key])).toEqual({});
    expect(resolveSavedMetricTreeSelection(tree, { empty: ['removed'] })).toEqual({
      checkedKeys: [],
      unknownFields: { empty: ['removed'] }
    });
  });

  it.each([
    { ...hierarchy, isLeaf: true },
    { ...hierarchy, children: [...hierarchy.children, hierarchy.children[0]!] },
    {
      ...hierarchy,
      children: [
        {
          ...hierarchy.children[0]!,
          children: [...hierarchy.children[0]!.children, hierarchy.children[0]!.children[0]!]
        }
      ]
    },
    { ...hierarchy, children: [{ ...hierarchy.children[0]!, isLeaf: true }] },
    {
      ...hierarchy,
      children: [
        {
          ...hierarchy.children[0]!,
          children: [
            {
              ...hierarchy.children[0]!.children[0]!,
              isLeaf: false
            }
          ]
        }
      ]
    }
  ])('rejects structurally ambiguous hierarchy %#', value => {
    expect(() => buildBulletinMetricTree(value)).toThrow(BulletinMetricTreeError);
  });

  it('rejects checked keys that do not belong to the active hierarchy', () => {
    expect(() => fieldsFromMetricTreeKeys(buildBulletinMetricTree(hierarchy), ['["field","old","status"]'])).toThrow(
      BulletinMetricTreeError
    );
  });
});
