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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.micrometer.observation.ObservationRegistry;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.junit.jupiter.api.Test;

class AgentControlledToolDispatcherTest {
    @Test
    void standardManagerInvokesOnlyTheControlledGatewayAndPreservesItsResult() {
        var dispatcher = new AgentControlledToolDispatcher(ObservationRegistry.create());
        var call = AgentRuntimeToolCall.builder().toolCallId("call-1").toolName("read.fixture").build();
        var expected = AgentToolExecutionResult.builder().toolCallId("call-1").toolName("read.fixture")
                .status(AgentToolStatus.SUCCEEDED).decision(AgentPolicyDecision.ALLOW).risk(AgentToolRisk.READ)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED).output("durable result").build();
        var attempts = new AtomicInteger();
        assertSame(expected, dispatcher.execute(call, () -> {
            attempts.incrementAndGet();
            return expected;
        }));
        assertEquals(1, attempts.get());
    }

    @Test
    void durableStopMustPropagateWithoutFallbackOrSecondExecution() {
        var dispatcher = new AgentControlledToolDispatcher(ObservationRegistry.NOOP);
        var call = AgentRuntimeToolCall.builder().toolCallId("call-1").toolName("read.fixture").build();
        var attempts = new AtomicInteger();
        var stop = new IllegalStateException("durable stop");
        assertSame(stop, assertThrows(IllegalStateException.class, () -> dispatcher.execute(call, () -> {
            attempts.incrementAndGet();
            throw stop;
        })));
        assertEquals(1, attempts.get());
    }
}
