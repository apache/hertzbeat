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

import { monitorExportFilename } from './monitor-export-model';

describe('monitor export model', () => {
  it('uses a decoded safe server filename and falls back by format', () => {
    expect(monitorExportFilename('attachment;filename=HertzBeat%20Monitors.json', 'JSON')).toBe(
      'HertzBeat Monitors.json'
    );
    expect(monitorExportFilename('attachment; filename="../../private.xlsx"', 'EXCEL')).toBe('private.xlsx');
    expect(monitorExportFilename('attachment; filename="bad\u0000name.json"', 'JSON')).toBe('hertzbeat-monitors.json');
    expect(monitorExportFilename('attachment; filename=".."', 'JSON')).toBe('hertzbeat-monitors.json');
    expect(monitorExportFilename(null, 'EXCEL')).toBe('hertzbeat-monitors.xlsx');
  });
});
