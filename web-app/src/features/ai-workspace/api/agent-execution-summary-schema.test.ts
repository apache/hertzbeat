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

import { agentExecutionSummarySchema } from './agent-gateway-schema';

const partial = {
  status: 'PARTIAL',
  totalAttempts: 2,
  succeededAttempts: 1,
  failedAttempts: 1,
  recoveredAttempts: 0,
  unresolvedAttempts: 1,
  unfinishedAttempts: 0,
  truncated: false,
  failures: [
    {
      toolCallId: 'failed',
      toolName: 'metrics.history',
      status: 'FAILED',
      errorMessage: 'field required',
      recovery: 'CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED',
      laterSuccessToolCallId: 'next'
    }
  ]
};

describe('server execution summary contract', () => {
  it('preserves explicit partial facts and historical failures', () => {
    expect(agentExecutionSummarySchema.parse(partial)).toEqual(partial);
  });
  it('rejects invented outcomes, negative counts, or tool inputs', () => {
    expect(agentExecutionSummarySchema.safeParse({ ...partial, status: 'HEALTHY' }).success).toBe(false);
    expect(agentExecutionSummarySchema.safeParse({ ...partial, failedAttempts: -1 }).success).toBe(false);
    expect(agentExecutionSummarySchema.safeParse({ ...partial, inputJson: 'private' }).success).toBe(false);
  });
  it('accepts server-only count limits while rejecting raw payload fields', () => {
    const coverage = {
      toolCallId: 'page',
      toolName: 'traces.query',
      state: 'PARTIAL_PAGE',
      unit: 'rows',
      start: 1000,
      end: 2000,
      offset: 0,
      returned: 10,
      total: 85,
      partial: true,
      truncated: false,
      scope: {}
    };
    expect(
      agentExecutionSummarySchema.safeParse({
        ...partial,
        queryCoverage: [coverage],
        coverageTruncated: false,
        stopReason: null
      }).success
    ).toBe(true);
    expect(
      agentExecutionSummarySchema.safeParse({ ...partial, queryCoverage: [{ ...coverage, rawLogs: 'private' }] })
        .success
    ).toBe(false);
  });

  it('keeps unavailable counts unknown instead of manufacturing zeros', () => {
    const unknown = {
      ...partial,
      status: 'UNKNOWN',
      totalAttempts: null,
      succeededAttempts: null,
      failedAttempts: null,
      recoveredAttempts: null,
      unresolvedAttempts: null,
      unfinishedAttempts: null,
      failures: []
    };
    expect(agentExecutionSummarySchema.parse(unknown).failedAttempts).toBeNull();
  });
});
