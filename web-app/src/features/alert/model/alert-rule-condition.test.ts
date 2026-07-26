/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { describe, expect, it } from 'vitest';

import { AlertRuleContractError } from './alert-rule-types';
import {
  parseMetricAlertCondition,
  serializeMetricAlertCondition,
  type MetricAlertConditionGroup,
  type MetricAlertField
} from './alert-rule-condition';

const fields: MetricAlertField[] = [
  { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
  { value: 'status', label: 'Status', type: 1, unit: null },
  { value: '__row__', label: 'Row count', type: 0, unit: null }
];

describe('metric alert structured condition', () => {
  it('serializes and parses the supported nested condition grammar losslessly', () => {
    const condition: MetricAlertConditionGroup = {
      kind: 'group',
      join: 'and',
      items: [
        { kind: 'condition', field: 'responseTime', operator: '>', value: 100 },
        {
          kind: 'group',
          join: 'or',
          items: [
            { kind: 'condition', field: 'status', operator: 'equals', value: 'DOWN' },
            { kind: 'condition', field: 'status', operator: '!exists', value: null }
          ]
        }
      ]
    };

    const expression = serializeMetricAlertCondition(condition, fields);

    expect(expression).toBe('responseTime > 100 and (equals(status, "DOWN") or !exists(status))');
    expect(parseMetricAlertCondition(expression, fields)).toEqual(condition);
  });

  it('keeps numeric, string, and existence operators bound to field types', () => {
    expect(() =>
      serializeMetricAlertCondition(
        {
          kind: 'group',
          join: 'and',
          items: [{ kind: 'condition', field: 'responseTime', operator: 'contains', value: '10' }]
        },
        fields
      )
    ).toThrow(AlertRuleContractError);
    expect(parseMetricAlertCondition('responseTime > 100', fields)).toEqual({
      kind: 'group',
      join: 'and',
      items: [{ kind: 'condition', field: 'responseTime', operator: '>', value: 100 }]
    });
    expect(parseMetricAlertCondition('responseTime >= 1e+21', fields)).toEqual({
      kind: 'group',
      join: 'and',
      items: [{ kind: 'condition', field: 'responseTime', operator: '>=', value: 1e21 }]
    });
    expect(parseMetricAlertCondition('equals(responseTime, "100")', fields)).toBeNull();
    expect(
      serializeMetricAlertCondition(
        {
          kind: 'group',
          join: 'and',
          items: [{ kind: 'condition', field: 'status', operator: 'equals', value: ' DOWN ' }]
        },
        fields
      )
    ).toBe('equals(status, " DOWN ")');
  });

  it('enforces the retired editor depth and per-group rule limits', () => {
    const tooDeep: MetricAlertConditionGroup = {
      kind: 'group',
      join: 'and',
      items: [
        {
          kind: 'group',
          join: 'and',
          items: [
            {
              kind: 'group',
              join: 'and',
              items: [
                {
                  kind: 'group',
                  join: 'and',
                  items: [{ kind: 'condition', field: '__row__', operator: '>', value: 0 }]
                }
              ]
            }
          ]
        }
      ]
    };
    const tooMany: MetricAlertConditionGroup = {
      kind: 'group',
      join: 'or',
      items: Array.from({ length: 6 }, (_, value) => ({
        kind: 'condition' as const,
        field: '__row__',
        operator: '>' as const,
        value
      }))
    };

    expect(() => serializeMetricAlertCondition(tooDeep, fields)).toThrow(AlertRuleContractError);
    expect(() => serializeMetricAlertCondition(tooMany, fields)).toThrow(AlertRuleContractError);
  });

  it('falls back to expert mode for expressions that cannot be represented without reinterpretation', () => {
    expect(parseMetricAlertCondition('responseTime > 10 and __row__ > 0 or responseTime < 100', fields)).toBeNull();
    expect(parseMetricAlertCondition('responseTime > 10 and unknown > 0', fields)).toBeNull();
    expect(parseMetricAlertCondition('responseTime > 10 && __row__ > 0', fields)).toBeNull();
    expect(parseMetricAlertCondition('equals(status, "unsafe\\"value")', fields)).toBeNull();
  });
});
