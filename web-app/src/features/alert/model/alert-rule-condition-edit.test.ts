/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  addMetricAlertCondition,
  addMetricAlertConditionGroup,
  changeMetricAlertConditionField,
  changeMetricAlertConditionOperator,
  removeMetricAlertConditionItem,
  updateMetricAlertConditionGroupJoin,
  updateMetricAlertConditionValue
} from './alert-rule-condition-edit';
import type { MetricAlertConditionGroup, MetricAlertField } from './alert-rule-condition';
import { AlertRuleContractError } from './alert-rule-types';

const fields: MetricAlertField[] = [
  { value: 'responseTime', label: 'Response time', type: 0, unit: 'ms' },
  { value: 'status', label: 'Status', type: 1, unit: null }
];

describe('metric alert condition editing', () => {
  it('adds and edits conditions with field-compatible operator values', () => {
    const empty = group();
    const numeric = addMetricAlertCondition(empty, [], fields);
    expect(numeric.items[0]).toEqual({
      kind: 'condition',
      field: 'responseTime',
      operator: '>',
      value: 0
    });

    const string = changeMetricAlertConditionField(numeric, [0], 'status', fields);
    expect(string.items[0]).toEqual({
      kind: 'condition',
      field: 'status',
      operator: 'equals',
      value: ''
    });
    expect(changeMetricAlertConditionOperator(string, [0], '!exists', fields).items[0]).toEqual({
      kind: 'condition',
      field: 'status',
      operator: '!exists',
      value: null
    });
    expect(updateMetricAlertConditionValue(string, [0], 'DOWN').items[0]).toMatchObject({ value: 'DOWN' });
    expect(updateMetricAlertConditionValue(numeric, [0], null).items[0]).toMatchObject({ value: null });
  });

  it('resets operator and value shape whenever the condition field or operator type changes', () => {
    const numeric = updateMetricAlertConditionValue(addMetricAlertCondition(group(), [], fields), [0], 250);
    const string = changeMetricAlertConditionField(numeric, [0], 'status', fields);
    const existence = changeMetricAlertConditionOperator(string, [0], 'exists', fields);
    const numericAgain = changeMetricAlertConditionField(existence, [0], 'responseTime', fields);

    expect(string.items[0]).toMatchObject({ field: 'status', operator: 'equals', value: '' });
    expect(existence.items[0]).toMatchObject({ field: 'status', operator: 'exists', value: null });
    expect(numericAgain.items[0]).toMatchObject({ field: 'responseTime', operator: '>', value: 0 });
  });

  it('adds nested groups, changes joins, and removes only the addressed item', () => {
    const root = addMetricAlertConditionGroup(addMetricAlertCondition(group(), [], fields), [], fields);
    const joined = updateMetricAlertConditionGroupJoin(root, [1], 'or');
    expect(joined.items[1]).toMatchObject({
      kind: 'group',
      join: 'or',
      items: [{ kind: 'condition', field: 'responseTime' }]
    });

    expect(removeMetricAlertConditionItem(joined, [0]).items).toHaveLength(1);
    expect((removeMetricAlertConditionItem(joined, [1, 0]).items[1] as MetricAlertConditionGroup).items).toEqual([]);
  });

  it('enforces the visual editor depth, item, path, and field boundaries', () => {
    let five = group();
    for (let index = 0; index < 5; index += 1) five = addMetricAlertCondition(five, [], fields);
    expect(() => addMetricAlertCondition(five, [], fields)).toThrow(AlertRuleContractError);

    const depthTwo = addMetricAlertConditionGroup(group(), [], fields);
    const depthThree = addMetricAlertConditionGroup(depthTwo, [0], fields);
    expect(() => addMetricAlertConditionGroup(depthThree, [0, 0], fields)).toThrow(AlertRuleContractError);
    expect(() => changeMetricAlertConditionField(five, [8], 'status', fields)).toThrow(AlertRuleContractError);
    expect(() => changeMetricAlertConditionField(five, [0], 'missing', fields)).toThrow(AlertRuleContractError);
  });
});

function group(): MetricAlertConditionGroup {
  return { kind: 'group', join: 'and', items: [] };
}
