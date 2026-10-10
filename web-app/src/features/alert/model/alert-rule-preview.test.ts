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

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  alertRulePreviewMaxCellCharacters,
  alertRulePreviewMaxCollectionItems,
  alertRulePreviewMaxValueDepth,
  formatAlertRulePreviewValueResult,
  type AlertRulePreviewValue
} from './alert-rule-preview';

describe('Alert Rule preview presentation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stops a huge nested array at the shared character and collection budgets', () => {
    const stringify = vi.spyOn(JSON, 'stringify');
    const value = {
      samples: Array.from({ length: alertRulePreviewMaxCollectionItems + 10 }, (_item, index) => ({
        index,
        payload: 'x'.repeat(alertRulePreviewMaxCellCharacters)
      }))
    };

    const result = formatAlertRulePreviewValueResult(value);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(alertRulePreviewMaxCellCharacters);
    expect(() => {
      JSON.parse(result.text);
    }).not.toThrow();
    expect(result.text.endsWith('}')).toBe(true);
    expect(stringify.mock.calls.every(([candidate]) => typeof candidate === 'string')).toBe(true);
  });

  it('stops descending when a nested object reaches the shared depth budget', () => {
    let value: AlertRulePreviewValue = 'leaf';
    for (let depth = 0; depth <= alertRulePreviewMaxValueDepth; depth += 1) {
      value = { nested: value };
    }

    const result = formatAlertRulePreviewValueResult(value);

    expect(result).toMatchObject({ truncated: true });
    expect(result.text).toContain('"…"');
    expect(result.text.length).toBeLessThanOrEqual(alertRulePreviewMaxCellCharacters);
    expect(() => {
      JSON.parse(result.text);
    }).not.toThrow();
    expect(result.text.endsWith('}')).toBe(true);
  });

  it('stops a huge object after the shared collection-item budget', () => {
    const value = Object.fromEntries(
      Array.from({ length: alertRulePreviewMaxCollectionItems + 1 }, (_item, index) => [`field-${index}`, index])
    );

    const result = formatAlertRulePreviewValueResult(value);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(alertRulePreviewMaxCellCharacters);
    expect(() => {
      JSON.parse(result.text);
    }).not.toThrow();
    expect(result.text.endsWith('}')).toBe(true);
  });

  it('never truncates an escape sequence or leaves a structured summary unclosed', () => {
    const result = formatAlertRulePreviewValueResult({
      escaped: '\\'.repeat(alertRulePreviewMaxCellCharacters),
      nested: ['"'.repeat(alertRulePreviewMaxCellCharacters)]
    });

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(alertRulePreviewMaxCellCharacters);
    expect(() => {
      JSON.parse(result.text);
    }).not.toThrow();
    expect(result.text.startsWith('{')).toBe(true);
    expect(result.text.endsWith('}')).toBe(true);
  });
});
