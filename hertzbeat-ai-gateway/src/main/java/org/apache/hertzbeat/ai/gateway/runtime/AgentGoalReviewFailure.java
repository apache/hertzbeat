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

import org.slf4j.LoggerFactory;

/** Fixed diagnostic vocabulary; upstream content and throwable messages must never be logged. */
enum AgentGoalReviewFailure {
    REQUEST_TOO_LARGE,
    REVIEW_UNAVAILABLE,
    MODEL_BUDGET_EXHAUSTED,
    CALL_FAILED,
    CALL_TIMEOUT,
    EMPTY_RESPONSE,
    UNEXPECTED_RESPONSE,
    MALFORMED_RESPONSE,
    INVALID_GOAL;

    String messageKey() {
        return "goalReview." + name();
    }

    void report(AgentRuntimeContext context, RuntimeException failure) {
        report(context, failure, null);
    }

    void report(
            AgentRuntimeContext context, RuntimeException failure, AgentTaskAssessment.Goal goal) {
        var rule = goal == null ? null : goal.validationFailure();
        LoggerFactory.getLogger(AgentRuntimeLoop.class)
                .warn(
                        "Monitor goal verification rejected runUid={} reason={} exceptionType={}"
                            + " rule={} field={} structure={}",
                        context.getRunUid(),
                        name(),
                        failure == null ? "none" : failure.getClass().getName(),
                        rule == null ? "NONE" : rule.name(),
                        rule == null ? "NONE" : rule.field(),
                        goal == null ? java.util.Map.of() : goal.structure());
    }
}
