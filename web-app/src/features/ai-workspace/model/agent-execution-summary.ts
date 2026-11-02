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

export type AgentQueryCoverage = {
  toolCallId: string;
  toolName: string;
  state: 'EMPTY_RESULT' | 'PARTIAL_PAGE' | 'BOUNDED_RESULTS' | 'OBSERVED_ROWS' | 'UNKNOWN';
  unit: 'rows' | 'points' | 'groups';
  start: number | null;
  end: number | null;
  offset: number | null;
  returned: number | null;
  total: number | null;
  partial: boolean;
  truncated: boolean;
  scope: Record<string, string>;
};

export type AgentExecutionSummary = {
  queryCoverage?: AgentQueryCoverage[] | undefined;
  coverageTruncated?: boolean | undefined;
  stopReason?: string | null | undefined;
  status: 'UNKNOWN' | 'IN_PROGRESS' | 'NO_RECORDS' | 'PARTIAL' | 'RECOVERED' | 'NO_FAILED_ATTEMPTS';
  totalAttempts: number | null;
  succeededAttempts: number | null;
  failedAttempts: number | null;
  recoveredAttempts: number | null;
  unresolvedAttempts: number | null;
  unfinishedAttempts: number | null;
  failures: {
    toolCallId: string | null;
    toolName: string | null;
    status: 'FAILED' | 'DENIED';
    errorMessage: string | null;
    recovery: 'UNRESOLVED' | 'SAME_REQUEST_SUCCEEDED' | 'CHANGED_REQUEST_SUCCEEDED_SCOPE_UNVERIFIED';
    laterSuccessToolCallId: string | null;
  }[];
  truncated: boolean;
};
