/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { alertRuleImportAccept, validateAlertRuleImportFile } from './alert-rule-import-model';

describe('Alert Rule import model', () => {
  it('accepts the backend-supported document formats', () => {
    expect(alertRuleImportAccept).toBe('.json,.xlsx,.yaml');
    for (const name of ['rules.json', 'rules.XLSX', 'rules.yaml']) {
      expect(validateAlertRuleImportFile(new File(['rule'], name))).toMatchObject({ valid: true });
    }
  });

  it('rejects missing, empty, and unsupported files before transport', () => {
    expect(validateAlertRuleImportFile(null)).toEqual({ valid: false, reason: 'required' });
    expect(validateAlertRuleImportFile(new File([], 'rules.json'))).toEqual({ valid: false, reason: 'empty' });
    expect(validateAlertRuleImportFile(new File(['rule'], 'rules.yml'))).toEqual({
      valid: false,
      reason: 'unsupported'
    });
  });
});
