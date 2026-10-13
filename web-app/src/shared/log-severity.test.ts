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

import { expect, it } from 'vitest';
import { logSeverityCategory, logSeverityLabel } from './log-severity';
it('maps all valid OTLP numeric severity ranges only when text is missing', () => {
  ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].forEach((label, index) => {
    for (let number = index * 4 + 1; number <= index * 4 + 4; number++) {
      expect(logSeverityLabel({ severityNumber: number, severityText: '' })).toBe(label);
    }
  });
  expect(logSeverityLabel({ severityText: 'SEVERE', severityNumber: 17 })).toBe('SEVERE');
  expect(logSeverityCategory(17)).toBe('ERROR');
  expect(logSeverityLabel({ severityText: null, severityNumber: 9 })).toBe('INFO');
  for (const severityNumber of [0, 25, -1, 1.5, NaN, null]) {
    expect(logSeverityLabel({ severityText: null, severityNumber })).toBeUndefined();
  }
});
