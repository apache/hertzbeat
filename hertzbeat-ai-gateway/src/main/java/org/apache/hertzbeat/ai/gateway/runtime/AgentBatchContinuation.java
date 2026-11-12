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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.List;

/** Server-owned continuation seed, derived only from an owner-checked durable batch lineage. */
record AgentBatchContinuation(
        String rootRunUid,
        int segment,
        AgentTaskAssessment.Goal goal,
        AgentMonitorBatch.Snapshot frozenPlan,
        List<AgentRuntimeReadBudget.Attempt> priorAttempts,
        int toolBudget,
        boolean readOnly,
        AgentExplicitManifestPlan.Reference manifestReference) {
    AgentBatchContinuation(String rootRunUid, int segment, AgentTaskAssessment.Goal goal,
            AgentMonitorBatch.Snapshot frozenPlan, List<AgentRuntimeReadBudget.Attempt> priorAttempts,
            int toolBudget, boolean readOnly) {
        this(rootRunUid, segment, goal, frozenPlan, priorAttempts, toolBudget, readOnly, null);
    }

    AgentBatchContinuation {
        priorAttempts = List.copyOf(priorAttempts);
        if (segment < 1 || segment > 64 || toolBudget < 1) {
            throw new IllegalArgumentException("Invalid explicit batch segment");
        }
    }
}
