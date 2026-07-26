/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { buildAlertLabelSuggestionState } from './alert-label-suggestion-model';

describe('alert label suggestions', () => {
  it('keeps proven alert keys while adding canonical server labels once', () => {
    expect(
      buildAlertLabelSuggestionState({
        keys: ['service', ' environment ', '', 'region', 'environment'],
        valuesByKey: {}
      })
    ).toEqual({
      kind: 'received',
      keys: ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env', 'environment', 'region']
    });
  });

  it('keeps manual tag authoring available when suggestions cannot be loaded', () => {
    expect(buildAlertLabelSuggestionState()).toEqual({
      kind: 'fallback',
      keys: ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env']
    });
  });
});
