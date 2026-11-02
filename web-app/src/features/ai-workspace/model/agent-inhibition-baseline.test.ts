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
import { isAgentInhibitionPreview } from './agent-inhibition-preview';
const config = {
  name: 'test',
  sourceLabels: { severity: 'critical' },
  targetLabels: { severity: 'warning' },
  equalLabels: ['host'],
  enable: false
};
describe('optional typed prior-state wire boundary', () => {
  it('accepts old absent/null previews and validated before fields for updates', () => {
    const base = { targetId: '100', sourceHash: 'a'.repeat(64), configuration: config };
    expect(isAgentInhibitionPreview(base, 'UPDATE')).toBe(true);
    expect(isAgentInhibitionPreview({ ...base, before: null }, 'UPDATE')).toBe(true);
    expect(isAgentInhibitionPreview({ ...base, before: config }, 'UPDATE')).toBe(true);
  });
  it('rejects arbitrary prior fields and a fabricated create-before state', () => {
    expect(
      isAgentInhibitionPreview(
        { targetId: '100', sourceHash: 'a'.repeat(64), configuration: config, before: { ...config, command: 'fake' } },
        'UPDATE'
      )
    ).toBe(false);
    expect(
      isAgentInhibitionPreview({ targetId: null, sourceHash: null, configuration: config, before: config }, 'CREATE')
    ).toBe(false);
  });
});
