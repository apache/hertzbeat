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

package org.apache.hertzbeat.ai.gateway.conversation;

import java.util.List;

/** Server-owned execution facts, independent of model narrative and distinct from data coverage. */
public record AgentExecutionSummary(String status, Integer totalAttempts, Integer succeededAttempts,
                                    Integer failedAttempts, Integer recoveredAttempts, Integer unresolvedAttempts,
                                    Integer unfinishedAttempts, List<Failure> failures, boolean truncated,
                                    List<AgentQueryCoverage> queryCoverage, boolean coverageTruncated, String stopReason) {
    public AgentExecutionSummary {
        failures = List.copyOf(failures);
        queryCoverage = List.copyOf(queryCoverage);
    }

    public AgentExecutionSummary(String status, Integer totalAttempts, Integer succeededAttempts,
                                 Integer failedAttempts, Integer recoveredAttempts, Integer unresolvedAttempts,
                                 Integer unfinishedAttempts, List<Failure> failures, boolean truncated) {
        this(status, totalAttempts, succeededAttempts, failedAttempts, recoveredAttempts, unresolvedAttempts,
                unfinishedAttempts, failures, truncated, List.of(), false, null);
    }

    public static AgentExecutionSummary unavailable() {
        return new AgentExecutionSummary("UNKNOWN", null, null, null, null, null, null, List.of(), false);
    }

    /** One historical failed attempt and its explicitly verified recovery relationship. */
    public record Failure(String toolCallId, String toolName, String status, String errorMessage,
                          String recovery, String laterSuccessToolCallId) { }
}
