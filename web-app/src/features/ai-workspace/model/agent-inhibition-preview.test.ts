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
import { isAgentInhibitionPreview, isInhibitionConfiguration } from './agent-inhibition-preview';
import { isAgentApprovalSummary } from './agent-approval-summary';
import { approvalSummaryFixture } from './agent-approval-summary-fixture';
const config = () => ({
  name: 'isolated-policy',
  sourceLabels: { severity: 'critical' },
  targetLabels: { severity: 'warning' },
  equalLabels: ['host'],
  enable: false
});
const preview = () => ({ targetId: null, sourceHash: null, configuration: config() });
describe('inhibition approval boundary', () => {
  it('accepts complete exact native policy and version-bound targets', () => {
    expect(isAgentInhibitionPreview(preview(), 'CREATE')).toBe(true);
    expect(
      isAgentInhibitionPreview({ ...preview(), targetId: '9007199254740993', sourceHash: 'a'.repeat(64) }, 'UPDATE')
    ).toBe(true);
    expect(
      isAgentInhibitionPreview({ targetId: '100', sourceHash: 'b'.repeat(64), configuration: null }, 'DELETE')
    ).toBe(true);
  });
  it('rejects free fields, mismatched operations and missing source hashes', () => {
    expect(isAgentInhibitionPreview({ ...preview(), command: 'fake' }, 'CREATE')).toBe(false);
    expect(isAgentInhibitionPreview(preview(), 'UPDATE')).toBe(false);
    expect(isAgentInhibitionPreview({ targetId: '100', sourceHash: null, configuration: config() }, 'UPDATE')).toBe(
      false
    );
    expect(isAgentInhibitionPreview({ ...preview(), configuration: null }, 'CREATE')).toBe(false);
  });
  it('enforces native matcher/count/unique-label bounds', () => {
    expect(isInhibitionConfiguration({ ...config(), sourceLabels: {} })).toBe(false);
    expect(isInhibitionConfiguration({ ...config(), equalLabels: ['host', 'host'] })).toBe(false);
    expect(isInhibitionConfiguration({ ...config(), sourceLabels: { host: 'x'.repeat(257) } })).toBe(false);
    expect(isInhibitionConfiguration({ ...config(), enable: 'false' })).toBe(false);
  });
  it('requires exact complete one-resource header and excludes other preview types', () => {
    const base = {
      ...approvalSummaryFixture(),
      operation: 'CREATE',
      targetCount: 1,
      targets: [],
      complete: true,
      inhibition: preview()
    };
    expect(isAgentApprovalSummary(base)).toBe(true);
    expect(isAgentApprovalSummary({ ...base, complete: false })).toBe(false);
    expect(isAgentApprovalSummary({ ...base, targetCount: 2 })).toBe(false);
    expect(isAgentApprovalSummary({ ...base, personal: { kind: 'FAVORITE' } })).toBe(false);
  });
});
