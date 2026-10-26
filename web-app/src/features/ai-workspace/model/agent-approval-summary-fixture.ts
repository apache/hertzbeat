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

import type { AgentApprovalSummary } from './agent-approval-summary';

export const approvalSummaryFixture = (): AgentApprovalSummary => ({
  version: 'approval-summary.v1' as const,
  operation: 'CREATE' as const,
  targetCount: 2,
  inputHash: 'a'.repeat(64),
  complete: true,
  maskedFields: ['FREE_TEXT'],
  targets: [
    {
      kind: 'WEBSITE' as const,
      id: null,
      origin: 'https://example.com',
      pathFingerprint: null,
      keyFingerprint: 'b'.repeat(16),
      intervals: 600,
      timeout: 1000
    },
    {
      kind: 'WEBSITE' as const,
      id: null,
      origin: 'https://example.org',
      pathFingerprint: null,
      keyFingerprint: 'c'.repeat(16),
      intervals: 600,
      timeout: 2000
    }
  ],
  changes: [{ field: 'RETRY_PREFLIGHT' as const, value: 'false' }]
});
