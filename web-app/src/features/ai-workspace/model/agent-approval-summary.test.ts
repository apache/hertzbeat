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
import { isAgentApprovalSummary } from './agent-approval-summary';
import { approvalSummaryFixture } from './agent-approval-summary-fixture';
describe('typed approval summary boundary', () => {
  it('accepts bounded safe display facts', () => expect(isAgentApprovalSummary(approvalSummaryFixture())).toBe(true));
  it('rejects free-text fields, arbitrary operations and unsafe origins', () => {
    expect(isAgentApprovalSummary({ ...approvalSummaryFixture(), rawArguments: { password: 'FAKE_SECRET' } })).toBe(
      false
    );
    expect(isAgentApprovalSummary({ ...approvalSummaryFixture(), operation: 'FAKE_FREE_TEXT' })).toBe(false);
    expect(
      isAgentApprovalSummary({
        ...approvalSummaryFixture(),
        targets: [{ ...approvalSummaryFixture().targets[0], origin: 'https://user:FAKE_SECRET@example.com/path' }]
      })
    ).toBe(false);
  });
});
