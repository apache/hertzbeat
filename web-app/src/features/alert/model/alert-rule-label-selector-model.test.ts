/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  alertRuleLabelMapFromRows,
  alertRuleLabelOptions,
  alertRuleLabelRowsFromValue
} from './alert-rule-label-selector-model';

describe('alert rule label selector model', () => {
  it('preserves complete labels and filters incomplete authoring rows', () => {
    expect(
      alertRuleLabelMapFromRows([
        { id: 1, key: 'environment', value: 'production' },
        { id: 2, key: 'team', value: '' }
      ])
    ).toEqual({ environment: 'production' });
    expect(alertRuleLabelRowsFromValue({})).toEqual([{ id: 1, key: '', value: '' }]);
  });

  it('combines canonical, selected and custom values without case-insensitive duplicates', () => {
    expect(alertRuleLabelOptions(['production', 'staging'], 'legacy', 'Preview')).toEqual([
      { label: 'Preview', value: 'Preview' }
    ]);
    expect(alertRuleLabelOptions(['production'], '', 'Production')).toEqual([
      { label: 'production', value: 'production' }
    ]);
    expect(alertRuleLabelOptions(['status-page'], '', 'custom-key')).toEqual([
      { label: 'custom-key', value: 'custom-key' }
    ]);
  });
});
