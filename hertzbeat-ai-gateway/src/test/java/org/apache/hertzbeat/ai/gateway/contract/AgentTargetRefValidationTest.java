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

package org.apache.hertzbeat.ai.gateway.contract;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

/** Validation contracts for operator-selected investigation context. */
class AgentTargetRefValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void acceptsCompleteSignalWindowAndTopologySelection() {
        AgentTargetRef target = AgentTargetRef.builder()
            .entityId(42L)
            .signal(AgentSignalRef.builder()
                .type("logs")
                .timeRange("last-30m")
                .start(1_000L)
                .end(2_000L)
                .build())
            .topology(AgentTopologyRef.builder().rootEntityId(42L).nodeId("42").depth(2).build())
            .build();

        assertTrue(validator.validate(target).isEmpty());
    }

    @Test
    void rejectsPartialOrReversedAbsoluteSignalWindows() {
        AgentTargetRef partial = AgentTargetRef.builder()
            .signal(AgentSignalRef.builder().type("metrics").start(1_000L).build())
            .build();
        AgentTargetRef reversed = AgentTargetRef.builder()
            .signal(AgentSignalRef.builder().type("traces").start(2_000L).end(1_000L).build())
            .build();

        assertFalse(validator.validate(partial).isEmpty());
        assertFalse(validator.validate(reversed).isEmpty());
    }

    @Test
    void rejectsUnknownSignalsAndUnboundedTopologyDepth() {
        AgentTargetRef target = AgentTargetRef.builder()
            .signal(AgentSignalRef.builder().type("events").build())
            .topology(AgentTopologyRef.builder().rootEntityId(42L).depth(11).build())
            .build();

        assertFalse(validator.validate(target).isEmpty());
    }
}
