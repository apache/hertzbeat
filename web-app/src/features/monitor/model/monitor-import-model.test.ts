/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import { validateMonitorImportFile } from './monitor-import-model';

describe('monitor import model', () => {
  it.each([
    'monitors.json',
    'monitors.xlsx',
    'monitors.yaml',
    'monitors.yml',
    'MONITORS.JSON',
    'MONITORS.YAML',
    'MONITORS.YML'
  ])('accepts a non-empty backend-supported %s file', name => {
    const file = new File(['content'], name);
    expect(validateMonitorImportFile(file)).toEqual({ valid: true, file });
  });

  it('distinguishes required, empty, and unsupported files without reading their contents', () => {
    expect(validateMonitorImportFile(null)).toEqual({ valid: false, reason: 'required' });
    expect(validateMonitorImportFile(new File([], 'monitors.json'))).toEqual({ valid: false, reason: 'empty' });
    expect(validateMonitorImportFile(new File(['content'], 'monitors'))).toEqual({
      valid: false,
      reason: 'unsupported'
    });
    expect(validateMonitorImportFile(new File(['content'], 'monitors.xls'))).toEqual({
      valid: false,
      reason: 'unsupported'
    });
  });
});
