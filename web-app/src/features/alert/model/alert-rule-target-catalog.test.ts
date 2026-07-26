/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { MonitorAppHierarchyNode } from '@/features/monitor';

import { AlertRuleContractError } from './alert-rule-types';
import { buildMetricAlertTargetCatalog } from './alert-rule-target-catalog';

const hierarchy: MonitorAppHierarchyNode = {
  category: 'application',
  value: 'springboot3',
  label: 'Spring Boot 3',
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
          value: 'responseTime',
          label: 'Response time',
          isLeaf: true,
          hide: null,
          type: 0,
          unit: 'ms',
          children: []
        },
        {
          category: null,
          value: 'status',
          label: null,
          isLeaf: true,
          hide: null,
          type: 1,
          unit: null,
          children: []
        }
      ]
    }
  ]
};

describe('metric alert target catalog', () => {
  it('projects the monitor hierarchy into availability and metric authoring choices', () => {
    expect(
      buildMetricAlertTargetCatalog(hierarchy, {
        availability: 'Availability',
        rowCount: 'Row count'
      })
    ).toEqual({
      app: { value: 'springboot3', label: 'Spring Boot 3' },
      targets: [
        {
          target: { kind: 'availability', app: 'springboot3' },
          label: 'Availability',
          fields: []
        },
        {
          target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
          label: 'Summary',
          fields: [
            { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
            { value: 'status', label: 'status', type: 1, unit: null },
            { value: '__row__', label: 'Row count', type: 0, unit: null }
          ]
        }
      ]
    });
  });

  it('keeps a metric available for row-count rules when it has no field definitions', () => {
    expect(
      buildMetricAlertTargetCatalog(
        {
          ...hierarchy,
          children: [{ ...hierarchy.children[0]!, children: [] }]
        },
        { availability: 'Availability', rowCount: 'Row count' }
      ).targets[1]
    ).toMatchObject({
      target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
      fields: [{ value: '__row__', label: 'Row count', type: 0, unit: null }]
    });
  });

  it('rejects duplicate identities instead of presenting an ambiguous target or field', () => {
    expect(() =>
      buildMetricAlertTargetCatalog(
        { ...hierarchy, children: [hierarchy.children[0]!, hierarchy.children[0]!] },
        { availability: 'Availability', rowCount: 'Row count' }
      )
    ).toThrow(AlertRuleContractError);
    expect(() =>
      buildMetricAlertTargetCatalog(
        {
          ...hierarchy,
          children: [
            {
              ...hierarchy.children[0]!,
              children: [hierarchy.children[0]!.children[0]!, hierarchy.children[0]!.children[0]!]
            }
          ]
        },
        { availability: 'Availability', rowCount: 'Row count' }
      )
    ).toThrow(AlertRuleContractError);
  });
});
