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

package org.apache.hertzbeat.ai.gateway.application;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.GatewayEventType;
import org.apache.hertzbeat.ai.gateway.application.GatewayEvent.RunCompletedPayload;

import org.junit.jupiter.api.Test;

/**
 * Test case for {@link GatewayEvent}.
 */
class GatewayEventTest {

    @Test
    void constructorShouldKeepTypedPayload() {
        RunCompletedPayload payload = new RunCompletedPayload("trace-1");

        GatewayEvent event = new GatewayEvent(GatewayEventType.RUN_COMPLETED, "event-1", null, null, null, null,
                payload, 100L);

        assertSame(payload, event.payload());
    }

    @Test
    void constructorShouldRejectMissingPayload() {
        assertThrows(NullPointerException.class, () -> new GatewayEvent(GatewayEventType.RUN_COMPLETED, "event-1",
                null, null, null, null, null, 100L));
    }

    @Test
    void constructorShouldRejectIncompleteEventIdentity() {
        RunCompletedPayload payload = new RunCompletedPayload("trace-1");

        assertThrows(NullPointerException.class, () -> new GatewayEvent(null, "event-1",
                null, null, null, null, payload, 100L));
        assertThrows(IllegalArgumentException.class, () -> new GatewayEvent(GatewayEventType.RUN_COMPLETED, " ",
                null, null, null, null, payload, 100L));
    }

    @Test
    void constructorShouldRejectInvalidTimestamp() {
        RunCompletedPayload payload = new RunCompletedPayload("trace-1");

        assertThrows(NullPointerException.class, () -> new GatewayEvent(GatewayEventType.RUN_COMPLETED, "event-1",
                null, null, null, null, payload, null));
        assertThrows(IllegalArgumentException.class, () -> new GatewayEvent(GatewayEventType.RUN_COMPLETED,
                "event-1", null, null, null, null, payload, -1L));
    }
}
