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

import {
  buildRealtimeMetricExpression,
  parseRealtimeMetricExpression,
  type RealtimeMetricExpressionContext
} from './alert-rule-metric-expression';
import { AlertRuleContractError } from './alert-rule-types';

describe('realtime metric alert expression', () => {
  it('builds one stable target, monitor, label, and threshold expression', () => {
    const context: RealtimeMetricExpressionContext = {
      target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
      monitorIds: [9, 7, 9],
      monitorLabels: ['team:platform', 'region:eu', 'team:platform'],
      condition: 'responseTime > 100'
    };

    expect(buildRealtimeMetricExpression(context)).toBe(
      'equals(__app__,"springboot3") && equals(__metrics__,"summary") && ' +
        '(equals(__instance__, "7") or equals(__instance__, "9")) && ' +
        '(contains(__labels__, "region:eu") or contains(__labels__, "team:platform")) && responseTime > 100'
    );
    expect(parseRealtimeMetricExpression(buildRealtimeMetricExpression(context))).toEqual({
      ...context,
      monitorIds: [7, 9],
      monitorLabels: ['region:eu', 'team:platform']
    });
  });

  it('parses the persisted wrapper without swallowing a raw threshold conjunction', () => {
    expect(
      parseRealtimeMetricExpression(
        'equals(__metrics__, "summary") && responseTime > 100 && status == 1 && ' +
          'equals(__app__, "springboot3") && equals(__instance__, "7")'
      )
    ).toEqual({
      target: { kind: 'metric', app: 'springboot3', metric: 'summary' },
      monitorIds: [7],
      monitorLabels: [],
      condition: 'responseTime > 100 && status == 1'
    });
  });

  it('round-trips the availability target without inventing a threshold', () => {
    const context: RealtimeMetricExpressionContext = {
      target: { kind: 'availability', app: 'linux' },
      monitorIds: [],
      monitorLabels: [],
      condition: ''
    };
    const expression = buildRealtimeMetricExpression(context);

    expect(expression).toBe('equals(__app__,"linux") && equals(__available__,"down")');
    expect(parseRealtimeMetricExpression(expression)).toEqual(context);
  });

  it('returns null for ambiguous or unsafe reserved context instead of partially rewriting it', () => {
    expect(
      parseRealtimeMetricExpression(
        'equals(__app__,"linux") && equals(__metrics__,"cpu") && equals(__metrics__,"memory") && usage > 90'
      )
    ).toBeNull();
    expect(
      parseRealtimeMetricExpression(
        'equals(__app__,"linux") && equals(__metrics__,"cpu") && ' +
          '(equals(__instance__, "7") or contains(__labels__, "team:ops")) && usage > 90'
      )
    ).toBeNull();
    expect(parseRealtimeMetricExpression('usage > 90')).toBeNull();
  });

  it('rejects values that the backend reserved-variable matcher cannot represent safely', () => {
    expect(() =>
      buildRealtimeMetricExpression({
        target: { kind: 'metric', app: 'spring"boot', metric: 'summary' },
        monitorIds: [],
        monitorLabels: [],
        condition: 'responseTime > 100'
      })
    ).toThrow(AlertRuleContractError);
    expect(() =>
      buildRealtimeMetricExpression({
        target: { kind: 'metric', app: 'springboot', metric: 'summary' },
        monitorIds: [0],
        monitorLabels: [],
        condition: 'responseTime > 100'
      })
    ).toThrow(AlertRuleContractError);
  });
});
