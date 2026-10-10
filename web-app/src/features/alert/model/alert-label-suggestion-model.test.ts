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

import { buildAlertLabelSuggestionState } from './alert-label-suggestion-model';

describe('alert label suggestions', () => {
  it('keeps proven alert keys while adding canonical server labels once', () => {
    expect(
      buildAlertLabelSuggestionState({
        keys: ['service', ' environment ', '', 'region', 'environment'],
        valuesByKey: { service: [], environment: ['production'], region: [] }
      })
    ).toEqual({
      kind: 'received',
      keys: ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env', 'environment', 'region'],
      catalog: {
        keys: ['service', 'environment', 'region'],
        valuesByKey: { service: [], environment: ['production'], region: [] }
      }
    });
  });

  it('keeps manual tag authoring available when suggestions cannot be loaded', () => {
    expect(buildAlertLabelSuggestionState()).toEqual({
      kind: 'fallback',
      keys: ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env']
    });
  });
});
