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

import { alertRuleImportAccept, validateAlertRuleImportFile } from './alert-rule-import-model';

describe('Alert Rule import model', () => {
  it('accepts the backend-supported document formats', () => {
    expect(alertRuleImportAccept).toBe('.json,.xlsx,.yaml,.yml');
    for (const name of ['rules.json', 'rules.XLSX', 'rules.yaml', 'rules.YML']) {
      expect(validateAlertRuleImportFile(new File(['rule'], name))).toMatchObject({ valid: true });
    }
  });

  it('rejects missing, empty, and unsupported files before transport', () => {
    expect(validateAlertRuleImportFile(null)).toEqual({ valid: false, reason: 'required' });
    expect(validateAlertRuleImportFile(new File([], 'rules.json'))).toEqual({ valid: false, reason: 'empty' });
    expect(validateAlertRuleImportFile(new File(['rule'], 'rules.txt'))).toEqual({
      valid: false,
      reason: 'unsupported'
    });
  });
});
