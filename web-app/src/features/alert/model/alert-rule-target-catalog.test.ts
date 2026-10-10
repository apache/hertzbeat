/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import type { MonitorAppHierarchyNode } from '@/features/monitor';

import { AlertRuleContractError } from './alert-rule-types';
import {
  buildMetricAlertTargetCatalog,
  isMetricAlertTargetInHierarchy,
  metricAlertFieldsForTarget
} from './alert-rule-target-catalog';

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

  it('accepts only targets projected by the current unambiguous hierarchy', () => {
    expect(isMetricAlertTargetInHierarchy(hierarchy, { kind: 'availability', app: 'springboot3' })).toBe(true);
    expect(isMetricAlertTargetInHierarchy(hierarchy, { kind: 'metric', app: 'springboot3', metric: 'summary' })).toBe(
      true
    );
    expect(isMetricAlertTargetInHierarchy(hierarchy, { kind: 'metric', app: 'springboot3', metric: 'missing' })).toBe(
      false
    );
    expect(isMetricAlertTargetInHierarchy(hierarchy, { kind: 'availability', app: 'linux' })).toBe(false);
    expect(
      isMetricAlertTargetInHierarchy(
        { ...hierarchy, children: [hierarchy.children[0]!, hierarchy.children[0]!] },
        { kind: 'availability', app: 'springboot3' }
      )
    ).toBe(false);
  });

  it('returns fields only for the selected metric target', () => {
    expect(metricAlertFieldsForTarget(hierarchy, { kind: 'metric', app: 'springboot3', metric: 'summary' })).toEqual([
      { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
      { value: 'status', label: 'status', type: 1, unit: null },
      { value: '__row__', label: 'row count', type: 0, unit: null }
    ]);
    expect(metricAlertFieldsForTarget(hierarchy, { kind: 'availability', app: 'springboot3' })).toBeNull();
    expect(metricAlertFieldsForTarget(hierarchy, { kind: 'metric', app: 'springboot3', metric: 'missing' })).toBeNull();
    expect(
      metricAlertFieldsForTarget(hierarchy, { kind: 'metric', app: 'springboot3', metric: 'summary' }, 'Value rows')
    ).toContainEqual({ value: '__row__', label: 'Value rows', type: 0, unit: null });
  });
});
